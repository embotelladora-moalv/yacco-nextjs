// scripts/backfill/expiration-date.ts
//
// BACKFILL: EXPIRATION DATE FOR PRODUCTION BATCHES
//
// Setea expirationDate = productionDate + 6 meses para todos los lotes
// en la colección "productionBatches" que no la tengan especificada.
//
// Uso (Dry-run por defecto):
//   NEW_SA_PATH=/ruta/nuevo-service-account.json npx ts-node \
//     --project scripts/migration/tsconfig.scripts.json \
//     scripts/backfill/expiration-date.ts
//
// Uso (Commit real en BD):
//   NEW_SA_PATH=/ruta/nuevo-service-account.json npx ts-node \
//     --project scripts/migration/tsconfig.scripts.json \
//     scripts/backfill/expiration-date.ts --commit

import { newDb } from "../migration/connections";
import * as admin from "firebase-admin";

const args = process.argv.slice(2);
const commit = args.includes("--commit");

function formatToISOString(date: Date): string {
  return date.toISOString().split("T")[0];
}

async function run() {
  console.log("=== INICIANDO BACKFILL DE EXPIRATION DATE EN LOTES ===");
  console.log(`Modo: ${commit ? "🔥 COMMIT REAL" : "🔍 DRY-RUN (Solo lectura)"}\n`);

  // 1. Obtener todos los lotes de producción
  const collectionRef = newDb.collection("productionBatches");
  const snap = await collectionRef.get();

  const totalBatches = snap.size;
  let alreadyHasExpirationDate = 0;
  let skipNoProductionDate = 0;

  const updates: Array<{
    id: string;
    lotNumber: string;
    productionDate: Date;
    calculatedExpirationDate: Date;
    calculatedExpirationTimestamp: admin.firestore.Timestamp;
  }> = [];

  snap.docs.forEach((doc) => {
    const data = doc.data();

    // Verificar si ya tiene expirationDate
    if (data.expirationDate !== undefined && data.expirationDate !== null) {
      alreadyHasExpirationDate++;
      return;
    }

    // Obtener y validar productionDate (puede ser Timestamp o Date según historia)
    let prodDate: Date | null = null;
    const rawProdDate = data.productionDate;

    if (rawProdDate instanceof admin.firestore.Timestamp) {
      prodDate = rawProdDate.toDate();
    } else if (rawProdDate) {
      const parsedDate = new Date(rawProdDate);
      if (!isNaN(parsedDate.getTime())) {
        prodDate = parsedDate;
      }
    }

    if (!prodDate) {
      skipNoProductionDate++;
      console.warn(`[WARNING] Lote ID: ${doc.id} no tiene productionDate válida.`);
      return;
    }

    // Calcular fecha de vencimiento (+6 meses)
    const calculatedDate = new Date(prodDate);
    calculatedDate.setMonth(calculatedDate.getMonth() + 6);
    const calculatedExpirationTimestamp = admin.firestore.Timestamp.fromDate(calculatedDate);

    updates.push({
      id: doc.id,
      lotNumber: data.lotNumber || "SIN-LOTE",
      productionDate: prodDate,
      calculatedExpirationDate: calculatedDate,
      calculatedExpirationTimestamp,
    });
  });

  // Mostrar resumen en consola
  console.log("=============================================================");
  console.log("  RESUMEN DE BATCHES DE PRODUCCIÓN");
  console.log("=============================================================");
  console.log(`Total Lot-Batches encontrados        : ${totalBatches}`);
  console.log(`Ya tienen expirationDate (skip)      : ${alreadyHasExpirationDate}`);
  console.log(`SKIP por falta de productionDate     : ${skipNoProductionDate}`);
  console.log(`Lotes a actualizar                   : ${updates.length}`);
  console.log("=============================================================\n");

  // Mostrar ejemplos para validación visual
  if (updates.length > 0) {
    console.log("Ejemplos Calculados (máx 5):");
    updates.slice(0, 5).forEach((item, index) => {
      console.log(`\n[Ejemplo ${index + 1}] ID: ${item.id} | Lote: ${item.lotNumber}`);
      console.log(`  - Fecha Producción      : ${formatToISOString(item.productionDate)}`);
      console.log(`  - Vencimiento Calculado : ${formatToISOString(item.calculatedExpirationDate)}`);
    });
  }

  // 2. Si es modo commit y hay actualizaciones, aplicar cambios en lotes de 500
  let updatedCount = 0;
  if (commit && updates.length > 0) {
    console.log(`\nAplicando ${updates.length} actualizaciones en Firestore en lotes de 500...`);

    let batch = newDb.batch();
    let countInBatch = 0;

    for (const item of updates) {
      const docRef = collectionRef.doc(item.id);
      batch.update(docRef, {
        expirationDate: item.calculatedExpirationTimestamp,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      countInBatch++;
      updatedCount++;

      if (countInBatch === 500) {
        await batch.commit();
        batch = newDb.batch();
        countInBatch = 0;
        console.log(`  - Lote de 500 commiteado`);
      }
    }

    if (countInBatch > 0) {
      await batch.commit();
      console.log(`  - Lote final de ${countInBatch} commiteado`);
    }

    console.log(`\n✅ Se actualizaron correctamente ${updatedCount} lotes en la base de datos.`);
  } else if (updates.length > 0) {
    console.log(`\n(Ejecuta con el flag --commit para aplicar estos cambios en Firestore)`);
  }

  process.exit(0);
}

run().catch((e) => {
  console.error("❌ Error en el script de backfill:", e);
  process.exit(1);
});
