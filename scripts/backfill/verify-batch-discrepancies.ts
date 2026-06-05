// scripts/backfill/verify-batch-discrepancies.ts
//
// VERIFICACIÓN DE DESCUADRES: CATÁLOGO VS BATCHES
//
// Compara el stockFilled en la colección "products" contra la suma de
// "currentStock" en los lotes de "productionBatches" por cada producto.
//
// Uso:
//   NEW_SA_PATH=/ruta/nuevo-service-account.json npx ts-node \
//     --project scripts/migration/tsconfig.scripts.json \
//     scripts/backfill/verify-batch-discrepancies.ts

import { newDb } from "../migration/connections";

async function run() {
  console.log("=== INICIANDO AUDITORÍA DE DESCUADRES (PRODUCTOS VS LOTES) ===\n");

  const productsSnap = await newDb.collection("products").get();
  const batchesSnap = await newDb.collection("productionBatches").get();

  console.log(`Total productos en catálogo : ${productsSnap.size}`);
  console.log(`Total lotes en base de datos: ${batchesSnap.size}\n`);

  // Agrupar lotes por productId
  const batchesByProduct: Record<string, any[]> = {};
  batchesSnap.docs.forEach((doc) => {
    const data = doc.data();
    const pId = data.productId;
    if (pId) {
      if (!batchesByProduct[pId]) {
        batchesByProduct[pId] = [];
      }
      batchesByProduct[pId].push({
        id: doc.id,
        lotNumber: data.lotNumber || "SIN-LOTE",
        currentStock: data.currentStock || 0,
      });
    }
  });

  const discrepancies: Array<{
    productId: string;
    productName: string;
    sku: string;
    stockFilled: number;
    batchesSum: number;
    difference: number;
    batchesList: string;
  }> = [];

  productsSnap.docs.forEach((doc) => {
    const pData = doc.data();
    const pId = doc.id;

    // Solo nos interesan productos que tengan stock lleno o que sean de tipo FULL_PRODUCT
    if (pData.operationalCategory === "ACCESSORY") return;

    const stockFilled = pData.stockFilled || 0;
    const productBatches = batchesByProduct[pId] || [];
    const batchesSum = productBatches.reduce((acc, b) => acc + b.currentStock, 0);

    const difference = stockFilled - batchesSum;

    if (difference !== 0) {
      const batchesList = productBatches
        .map((b) => `${b.lotNumber} (${b.currentStock} ud)`)
        .join(", ") || "Ningún lote con stock > 0";

      discrepancies.push({
        productId: pId,
        productName: pData.name || "Sin Nombre",
        sku: pData.sku || "Sin SKU",
        stockFilled,
        batchesSum,
        difference,
        batchesList,
      });
    }
  });

  if (discrepancies.length === 0) {
    console.log("✅ ¡Felicidades! Todos los productos están perfectamente cuadradados con sus lotes.");
  } else {
    console.log("⚠️ SE ENCONTRARON LOS SIGUIENTES DESCUADRES:");
    console.log("====================================================================================================");
    console.log(
      String("SKU").padEnd(10) +
        " | " +
        String("PRODUCTO").padEnd(30) +
        " | " +
        String("CATÁLOGO").padStart(10) +
        " | " +
        String("LOTES SUM").padStart(10) +
        " | " +
        String("DIFERENCIA").padStart(12)
    );
    console.log("====================================================================================================");

    discrepancies.forEach((item) => {
      console.log(
        item.sku.padEnd(10) +
          " | " +
          item.productName.substring(0, 30).padEnd(30) +
          " | " +
          String(item.stockFilled).padStart(10) +
          " | " +
          String(item.batchesSum).padStart(10) +
          " | " +
          String(item.difference).padStart(12)
      );
      console.log(`   └─ Lotes activos: ${item.batchesList}\n`);
    });

    console.log("====================================================================================================");
    console.log(`Total de productos descuadrados: ${discrepancies.length}`);
    console.log("Nota: Una diferencia positiva significa que el catálogo tiene más stock que los lotes (típico de ventas en planta previas al fix).");
  }

  process.exit(0);
}

run().catch((e) => {
  console.error("❌ Error en el script de verificación:", e);
  process.exit(1);
});
