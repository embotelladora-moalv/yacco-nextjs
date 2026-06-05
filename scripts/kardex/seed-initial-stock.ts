// scripts/kardex/seed-initial-stock.ts
//
// SEED INITIAL STOCK FOR PRODUCTS
//
// Sienta el saldo inicial de stock en planta para 5 SKUs de productos
// y genera su correspondiente log de Kardex con tipo "INITIAL".
//
// Uso (Dry-run por defecto):
//   NEW_SA_PATH=/ruta/nuevo-service-account.json npx ts-node \
//     --project scripts/migration/tsconfig.scripts.json \
//     scripts/kardex/seed-initial-stock.ts
//
// Uso (Commit real en BD):
//   NEW_SA_PATH=/ruta/nuevo-service-account.json npx ts-node \
//     --project scripts/migration/tsconfig.scripts.json \
//     scripts/kardex/seed-initial-stock.ts --commit

import { newDb } from "../migration/connections";
import * as admin from "firebase-admin";

const args = process.argv.slice(2);
const commit = args.includes("--commit");

const TARGETS = [
  { sku: "BID-20L-N", quantity: 27 },
  { sku: "BID-20L-C-ALM", quantity: 49 },
  { sku: "BID-20L-C-LIM", quantity: 25 },
  { sku: "BID-20L-C", quantity: 34 },
  { sku: "BID-20L-N-BIO", quantity: 68 },
];

interface SkuStatus {
  sku: string;
  productId: string;
  exists: boolean;
  currentStock: number;
  kardexLogsCount: number;
  hasInitialLog: boolean;
  action: "SEED" | "SKIP-ya-sembrado" | "SKIP-ya-tiene-movimientos" | "ERROR-no-existe";
  productRef?: admin.firestore.DocumentReference;
}

async function run() {
  console.log("=== INICIANDO SEMBRADO DE STOCK INICIAL ===");
  console.log(`Modo: ${commit ? "🔥 COMMIT REAL" : "🔍 DRY-RUN (Solo lectura)"}\n`);

  const skuStatuses: SkuStatus[] = [];

  for (const target of TARGETS) {
    const productSnap = await newDb
      .collection("products")
      .where("sku", "==", target.sku)
      .limit(1)
      .get();

    if (productSnap.empty) {
      skuStatuses.push({
        sku: target.sku,
        productId: "-",
        exists: false,
        currentStock: 0,
        kardexLogsCount: 0,
        hasInitialLog: false,
        action: "ERROR-no-existe",
      });
      continue;
    }

    const doc = productSnap.docs[0];
    const productData = doc.data();
    const productId = doc.id;
    const currentStock = productData.stockFilled ?? 0;

    // Buscar en la colección kardexLogs
    const kardexSnap = await newDb
      .collection("kardexLogs")
      .where("productId", "==", productId)
      .get();

    const kardexLogsCount = kardexSnap.size;
    let hasInitialLog = false;

    kardexSnap.forEach((kDoc) => {
      if (kDoc.data().movementType === "INITIAL" || kDoc.data().referenceType === "INITIAL_STOCK") {
        hasInitialLog = true;
      }
    });

    let action: SkuStatus["action"] = "SEED";
    if (hasInitialLog) {
      action = "SKIP-ya-sembrado";
    } else if (kardexLogsCount > 0) {
      action = "SKIP-ya-tiene-movimientos";
    }

    skuStatuses.push({
      sku: target.sku,
      productId,
      exists: true,
      currentStock,
      kardexLogsCount,
      hasInitialLog,
      action,
      productRef: doc.ref,
    });
  }

  // Mostrar tabla en consola
  console.log("=========================================================================================");
  console.log("  ESTADO DE PRODUCTOS Y EVALUACIÓN DE ACCIÓN");
  console.log("=========================================================================================");
  console.log("| SKU             | ID Producto          | Existe | Stock Actual | #Logs | Acción                     |");
  console.log("|-----------------|----------------------|--------|--------------|-------|----------------------------|");
  skuStatuses.forEach((s) => {
    const existsStr = s.exists ? "Sí" : "No";
    const currentStockStr = s.exists ? s.currentStock.toString() : "-";
    const logsStr = s.exists ? s.kardexLogsCount.toString() : "-";
    console.log(
      `| ${s.sku.padEnd(15)} | ${s.productId.padEnd(20)} | ${existsStr.padEnd(6)} | ${currentStockStr.padEnd(12)} | ${logsStr.padEnd(5)} | ${s.action.padEnd(26)} |`
    );
  });
  console.log("=========================================================================================\n");

  const toSeed = skuStatuses.filter((s) => s.action === "SEED");

  if (toSeed.length === 0) {
    console.log("No hay productos pendientes por sembrar saldo inicial.");
    process.exit(0);
  }

  if (!commit) {
    console.log(`(Ejecuta con el flag --commit para aplicar el sembrado de los ${toSeed.length} productos marcados SEED)`);
    process.exit(0);
  }

  // FASE COMMIT: Procesar en transacciones individuales
  console.log(`Aplicando sembrado de stock inicial para ${toSeed.length} productos...`);

  for (const status of toSeed) {
    const targetInfo = TARGETS.find((t) => t.sku === status.sku)!;
    
    await newDb.runTransaction(async (transaction) => {
      // 1. Re-leer el producto dentro de la transacción por seguridad
      const pDoc = await transaction.get(status.productRef!);
      if (!pDoc.exists) {
        throw new Error(`El producto ${status.sku} desapareció durante la transacción.`);
      }

      // 2. Re-verificar si ya tiene log de INITIAL para evitar carrera o doble sembrado
      const doubleCheckKardex = await newDb
        .collection("kardexLogs")
        .where("productId", "==", status.productId)
        .where("movementType", "==", "INITIAL")
        .limit(1)
        .get();

      if (!doubleCheckKardex.empty) {
        console.log(`  - [SKIP] ${status.sku} ya fue sembrado por otro proceso simultáneo.`);
        return;
      }

      // 3. Escribir el nuevo stock y actualizar fecha de modificación
      transaction.update(status.productRef!, {
        stockFilled: targetInfo.quantity,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 4. Crear el log de Kardex inicial
      const kardexRef = newDb.collection("kardexLogs").doc();
      transaction.set(kardexRef, {
        productId: status.productId,
        type: "IN",
        phase: "FILLED",
        quantity: targetInfo.quantity,
        referenceId: null,
        referenceType: "INITIAL_STOCK",
        previousStock: 0,
        newStock: targetInfo.quantity,
        movementType: "INITIAL",
        delta: targetInfo.quantity,
        resultingBalance: targetInfo.quantity,
        note: "Saldo inicial planta",
        userId: "SYSTEM",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`  - [OK] ${status.sku} inicializado con stockFilled = ${targetInfo.quantity}`);
    });
  }

  console.log("\n✅ Sembrado finalizado correctamente.");
  process.exit(0);
}

run().catch((e) => {
  console.error("❌ Error fatal en sembrado:", e);
  process.exit(1);
});
