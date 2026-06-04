// scripts/backfill/liquidation-date.ts
//
// BACKFILL: LIQUIDATION DATE FOR DISPATCH MANIFESTS
//
// Setea liquidationDate = dispatchDate a las 20:00:00 hora de Lima (UTC-5)
// para todos los manifiestos con status == "LIQUIDATED" que no tengan liquidationDate.
//
// Uso (Dry-run por defecto):
//   NEW_SA_PATH=/ruta/nuevo-service-account.json npx ts-node \
//     --project scripts/migration/tsconfig.scripts.json \
//     scripts/backfill/liquidation-date.ts
//
// Uso (Commit real en BD):
//   NEW_SA_PATH=/ruta/nuevo-service-account.json npx ts-node \
//     --project scripts/migration/tsconfig.scripts.json \
//     scripts/backfill/liquidation-date.ts --commit

import { newDb } from "../migration/connections";
import * as admin from "firebase-admin";

const args = process.argv.slice(2);
const commit = args.includes("--commit");

/**
 * Formatea una fecha a formato ISO-like en la zona horaria de Lima (America/Lima).
 * Lima está en UTC-5 permanentemente (sin DST).
 */
function formatToLimaISO(date: Date): string {
  try {
    const formatter = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "America/Lima",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    return formatter.format(date).replace(" ", "T") + "-05:00";
  } catch (e) {
    return date.toISOString(); // Fallback
  }
}

/**
 * Calcula la fecha de liquidación objetivo (20:00:00 hora Lima) a partir de dispatchDate.
 * 20:00:00 en Lima (UTC-5) equivale a las 01:00:00 UTC del día siguiente.
 */
function calculateLiquidationDate(dispatchDate: Date): Date {
  // Convertimos dispatchDate a la fecha correspondiente de Lima (restando 5 horas al instante UTC)
  const limaTime = new Date(dispatchDate.getTime() - 5 * 60 * 60 * 1000);
  const yyyy = limaTime.getUTCFullYear();
  const mm = limaTime.getUTCMonth();
  const dd = limaTime.getUTCDate();

  // Construimos las 20:00 Lima (UTC-5) para ese año-mes-día.
  // 20:00 en Lima + 5 horas de offset = 25:00 UTC, lo cual se traduce automáticamente al día siguiente a la 01:00 UTC.
  const targetUtcMs = Date.UTC(yyyy, mm, dd, 20 + 5, 0, 0, 0);
  return new Date(targetUtcMs);
}

async function run() {
  console.log("=== INICIANDO BACKFILL DE LIQUIDATION DATE ===");
  console.log(`Modo: ${commit ? "🔥 COMMIT REAL" : "🔍 DRY-RUN (Solo lectura)"}\n`);

  // 1. Obtener manifiestos liquidados
  const query = newDb.collection("dispatchManifests").where("status", "==", "LIQUIDATED");
  const snap = await query.get();
  
  const totalLiquidated = snap.size;
  let alreadyHasLiquidationDate = 0;
  let skipNoDispatchDate = 0;
  
  const updates: Array<{
    id: string;
    manifestNumber: string;
    dispatchDate: Date;
    calculatedDate: Date;
    calculatedTimestamp: admin.firestore.Timestamp;
  }> = [];

  snap.docs.forEach((doc) => {
    const data = doc.data();
    
    // Verificar si ya tiene liquidationDate
    if (data.liquidationDate !== undefined && data.liquidationDate !== null) {
      alreadyHasLiquidationDate++;
      return;
    }

    // Verificar si tiene dispatchDate y es de tipo Timestamp
    const dispatchDateTs = data.dispatchDate;
    if (!dispatchDateTs || !(dispatchDateTs instanceof admin.firestore.Timestamp)) {
      skipNoDispatchDate++;
      return;
    }

    const dispatchDate = dispatchDateTs.toDate();
    const calculatedDate = calculateLiquidationDate(dispatchDate);
    const calculatedTimestamp = admin.firestore.Timestamp.fromDate(calculatedDate);

    updates.push({
      id: doc.id,
      manifestNumber: data.manifestNumber || "SIN-NRO",
      dispatchDate,
      calculatedDate,
      calculatedTimestamp,
    });
  });

  // Mostrar resumen en consola
  console.log("=============================================================");
  console.log("  RESUMEN DE MANIFIESTOS LIQUIDADOS");
  console.log("=============================================================");
  console.log(`Total Liquidados ("LIQUIDATED")   : ${totalLiquidated}`);
  console.log(`Ya tienen liquidationDate (skip)  : ${alreadyHasLiquidationDate}`);
  console.log(`SKIP por falta de dispatchDate    : ${skipNoDispatchDate}`);
  console.log(`Manifiestos a actualizar          : ${updates.length}`);
  console.log("=============================================================\n");

  // Mostrar 5 ejemplos detallados para validación de zona horaria
  console.log("Ejemplos Calculados (máx 5):");
  updates.slice(0, 5).forEach((item, index) => {
    console.log(`\n[Ejemplo ${index + 1}] ID: ${item.id} | Nro: ${item.manifestNumber}`);
    console.log(`  - Dispatch Date UTC       : ${item.dispatchDate.toISOString()}`);
    console.log(`  - Dispatch Date Lima      : ${formatToLimaISO(item.dispatchDate)}`);
    console.log(`  - Liquidation Date UTC    : ${item.calculatedDate.toISOString()}`);
    console.log(`  - Liquidation Date Lima   : ${formatToLimaISO(item.calculatedDate)}`);
  });

  // 2. Si es modo commit, escribir los cambios en lotes de 500
  let updatedCount = 0;
  if (commit && updates.length > 0) {
    console.log(`\nAplicando ${updates.length} actualizaciones en Firestore en lotes de 500...`);
    
    let batch = newDb.batch();
    let countInBatch = 0;

    for (const item of updates) {
      const docRef = newDb.collection("dispatchManifests").doc(item.id);
      batch.update(docRef, {
        liquidationDate: item.calculatedTimestamp,
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

    console.log(`\n✅ Se actualizaron correctamente ${updatedCount} manifiestos en la base de datos.`);
  } else if (updates.length > 0) {
    console.log(`\n(Ejecuta con el flag --commit para aplicar estos cambios en Firestore)`);
  }

  process.exit(0);
}

run().catch((e) => {
  console.error("❌ Error en el script de backfill:", e);
  process.exit(1);
});
