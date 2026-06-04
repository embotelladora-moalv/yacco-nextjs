// scripts/migration/migrate.ts
// Uso: npx ts-node --project scripts/migration/tsconfig.scripts.json scripts/migration/migrate.ts [opciones]
//
// Opciones:
//   --dry-run            Solo muestra qué haría, sin escribir en Firestore
//   --collection <name>  Migra solo esa colección (nombre viejo, ej: vouchers)
//   --help               Muestra este mensaje
//
// Orden de migración (respeta dependencias):
//   1. paymentReasons, uselessReasons, users, vehicles
//   2. products, customers
//   3. cashMovements, distributions
//   4. movements, vouchers

import { oldProjectId, newProjectId } from "./connections";
import { log, MigrationResult } from "./migrationHelpers";
import { migratePaymentReasons } from "./transforms/paymentReasons";
import { migrateUselessReasons } from "./transforms/uselessReasons";
import { migrateUsers } from "./transforms/users";
import { migrateVehicles } from "./transforms/vehicles";
import { migrateProducts } from "./transforms/products";
import { migrateCustomers } from "./transforms/customers";
import { migrateCashMovements } from "./transforms/cashMovements";
import { migrateDistributions } from "./transforms/distributions";
import { migrateMovements } from "./transforms/movements";
import { migrateVouchers } from "./transforms/vouchers";

const COLLECTIONS: Record<
  string,
  (dryRun: boolean) => Promise<MigrationResult>
> = {
  paymentReasons: migratePaymentReasons,
  uselessReasons: migrateUselessReasons,
  users: migrateUsers,
  vehicles: migrateVehicles,
  products: migrateProducts,
  customers: migrateCustomers,
  cashMovements: migrateCashMovements,
  distributions: migrateDistributions,
  movements: migrateMovements,
  vouchers: migrateVouchers,
};

// Orden de ejecución cuando se corre todo
const RUN_ORDER = [
  "paymentReasons",
  "uselessReasons",
  "users",
  "vehicles",
  "products",
  "customers",
  "cashMovements",
  "distributions",
  "movements",
  "vouchers",
];

function printHelp() {
  console.log(`
Uso: npx ts-node --project scripts/migration/tsconfig.scripts.json scripts/migration/migrate.ts [opciones]

Opciones:
  --dry-run              Solo muestra qué haría, sin escribir
  --collection <nombre>  Migra solo esa colección (nombre viejo)
  --help                 Esta ayuda

Colecciones disponibles:
  ${RUN_ORDER.join(", ")}
`);
}

function printSummary(results: MigrationResult[]) {
  console.log("\n═══════════════════════════════════════");
  console.log("  RESUMEN DE MIGRACIÓN");
  console.log("═══════════════════════════════════════");
  let totalRead = 0;
  let totalWritten = 0;
  let totalErrors = 0;
  for (const r of results) {
    const status = r.errors.length > 0 ? "⚠️ " : "✓ ";
    console.log(
      `${status} ${r.collection.padEnd(45)} read=${r.read} written=${r.written} skip=${r.skipped} err=${r.errors.length}`
    );
    if (r.errors.length > 0) {
      r.errors.forEach((e) => console.log(`    ❌ ${e}`));
    }
    totalRead += r.read;
    totalWritten += r.written;
    totalErrors += r.errors.length;
  }
  console.log("───────────────────────────────────────");
  console.log(
    `   TOTAL: read=${totalRead}  written=${totalWritten}  errores=${totalErrors}`
  );
  console.log("═══════════════════════════════════════\n");
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help")) {
    printHelp();
    process.exit(0);
  }

  const dryRun = args.includes("--dry-run");
  const colIdx = args.indexOf("--collection");
  const targetCollection = colIdx !== -1 ? args[colIdx + 1] : null;

  console.log("\n╔══════════════════════════════════════╗");
  console.log("║      YACCO — MIGRACIÓN DE DATOS      ║");
  console.log("╚══════════════════════════════════════╝");
  console.log(`  Origen : ${oldProjectId}`);
  console.log(`  Destino: ${newProjectId}`);
  console.log(`  Modo   : ${dryRun ? "DRY-RUN (sin escrituras)" : "⚠️  PRODUCCIÓN — escribiendo en Firestore"}`);
  if (targetCollection) console.log(`  Colección: ${targetCollection}`);
  console.log("");

  if (!dryRun) {
    console.log("⚠️  Vas a escribir datos reales en el proyecto nuevo.");
    console.log("   Presioná Ctrl+C en los próximos 5 segundos para cancelar...\n");
    await new Promise((r) => setTimeout(r, 5000));
  }

  const toRun = targetCollection
    ? [targetCollection]
    : RUN_ORDER;

  const results: MigrationResult[] = [];

  for (const col of toRun) {
    const fn = COLLECTIONS[col];
    if (!fn) {
      console.error(`❌ Colección desconocida: "${col}"`);
      console.error(`   Disponibles: ${Object.keys(COLLECTIONS).join(", ")}`);
      process.exit(1);
    }
    log(`\n── Migrando: ${col} ──`);
    try {
      const result = await fn(dryRun);
      results.push(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`❌ Error en ${col}: ${msg}`);
      results.push({
        collection: col,
        read: 0,
        written: 0,
        skipped: 0,
        errors: [msg],
      });
    }
  }

  printSummary(results);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error fatal:", err);
  process.exit(1);
});
