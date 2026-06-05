// scripts/backfill/create-historical-batches.ts
//
// AJUSTE DE DESCUADRES HISTÓRICOS
//
// Crea lotes de producción históricos con fecha 01/06/2026 (Lote L-20260601)
// para absorber los descuadres detectados en la auditoría y alinear la suma de lotes
// con el stock materializado del catálogo.
//
// Uso (Dry-run por defecto):
//   NEW_SA_PATH=/ruta/nuevo-service-account.json npx ts-node \
//     --project scripts/migration/tsconfig.scripts.json \
//     scripts/backfill/create-historical-batches.ts
//
// Uso (Commit real en BD):
//   NEW_SA_PATH=/ruta/nuevo-service-account.json npx ts-node \
//     --project scripts/migration/tsconfig.scripts.json \
//     scripts/backfill/create-historical-batches.ts --commit

import { newDb } from "../migration/connections";
import * as admin from "firebase-admin";

const args = process.argv.slice(2);
const commit = args.includes("--commit");

// Fecha de producción histórica fija: 01/06/2026
const HISTORICAL_PROD_DATE = new Date("2026-06-01T12:00:00");
const HISTORICAL_EXP_DATE = new Date("2026-12-01T12:00:00");
const HISTORICAL_LOT_NUMBER = "L-20260601";

async function run() {
  console.log("=== AJUSTANDO DESCUADRES CREANDO LOTES HISTÓRICOS (L-20260601) ===");
  console.log(`Modo: ${commit ? "🔥 COMMIT REAL" : "🔍 DRY-RUN (Solo lectura)"}\n`);

  // 1. Obtener productos y lotes existentes
  const productsSnap = await newDb.collection("products").get();
  const batchesSnap = await newDb.collection("productionBatches").get();

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

  const adjustmentBatches: Array<{
    productId: string;
    productName: string;
    sku: string;
    difference: number;
  }> = [];

  productsSnap.docs.forEach((doc) => {
    const pData = doc.data();
    const pId = doc.id;

    if (pData.operationalCategory === "ACCESSORY") return;

    const stockFilled = pData.stockFilled || 0;
    const productBatches = batchesByProduct[pId] || [];
    const batchesSum = productBatches.reduce((acc, b) => acc + b.currentStock, 0);
    const difference = stockFilled - batchesSum;

    if (difference > 0) {
      adjustmentBatches.push({
        productId: pId,
        productName: pData.name || "Sin Nombre",
        sku: pData.sku || "Sin SKU",
        difference: difference,
      });
    }
  });

  if (adjustmentBatches.length === 0) {
    console.log("✅ No se detectaron diferencias positivas que requieran ajuste.");
    process.exit(0);
  }

  console.log("Lotes históricos a crear:");
  console.log("========================================================================");
  console.log(
    String("SKU").padEnd(15) +
      " | " +
      String("PRODUCTO").padEnd(30) +
      " | " +
      String("CANTIDAD (DIF)").padStart(15)
  );
  console.log("========================================================================");

  adjustmentBatches.forEach((batch) => {
    console.log(
      batch.sku.padEnd(15) +
        " | " +
        batch.productName.substring(0, 30).padEnd(30) +
        " | " +
        String(batch.difference).padStart(15)
    );
  });
  console.log("========================================================================\n");

  if (commit) {
    console.log(`Escribiendo ${adjustmentBatches.length} nuevos lotes en Firestore...`);
    const batchWriter = newDb.batch();

    adjustmentBatches.forEach((adj) => {
      const docRef = newDb.collection("productionBatches").doc();
      batchWriter.set(docRef, {
        productId: adj.productId,
        lotNumber: HISTORICAL_LOT_NUMBER,
        quantityProduced: adj.difference,
        currentStock: adj.difference,
        productionDate: admin.firestore.Timestamp.fromDate(HISTORICAL_PROD_DATE),
        expirationDate: admin.firestore.Timestamp.fromDate(HISTORICAL_EXP_DATE),
        managerId: "SYSTEM_BACKFILL",
        isTollManufacturing: false,
        notes: "Ajuste automático de descuadre histórico - Lote inicial",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batchWriter.commit();
    console.log("✅ Lotes creados exitosamente en Firestore.");
  } else {
    console.log("(Ejecuta con el flag --commit para crear estos lotes en Firestore)");
  }

  process.exit(0);
}

run().catch((e) => {
  console.error("❌ Error en el script de ajuste:", e);
  process.exit(1);
});
