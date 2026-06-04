// scripts/migration/verify-migration.ts
// SOLO LECTURA — no escribe ni modifica ningún documento.
//
// Uso:
//   NEW_SA_PATH=/ruta/new-sa.json npx ts-node \
//     --project scripts/migration/tsconfig.scripts.json \
//     scripts/migration/verify-migration.ts
//
// Output:
//   - Consola: resumen con tablas
//   - docs/migration/VERIFICATION-REPORT.md: reporte completo

import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
import { oldDb, newDb, oldProjectId, newProjectId } from "./connections";

// ── Tipos internos ─────────────────────────────────────────────────────────

interface CountRow {
  entity: string;
  oldCollection: string;
  newCollection: string;
  oldCount: number;
  newCount: number;
  diff: number;
  match: boolean;
}

interface OrphanResult {
  entity: string;
  field: string;
  referencedCollection: string;
  total: number;
  examples: string[];
}

interface FieldIssue {
  collection: string;
  check: string;
  total: number;
  examples: string[];
}

interface TypeIssue {
  collection: string;
  field: string;
  expectedType: string;
  foundType: string;
  docId: string;
  foundValue: unknown;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const PII_FIELDS = new Set([
  "name", "fullName", "phone", "email", "documentId", "address", "reference",
]);

function anon(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = PII_FIELDS.has(k) ? "***" : v;
  }
  return out;
}

function ts(): string {
  return new Date().toISOString().slice(11, 19);
}
function log(msg: string) { console.log(`[${ts()}] ${msg}`); }

async function countCollection(db: admin.firestore.Firestore, col: string): Promise<number> {
  const snap = await db.collection(col).count().get();
  return snap.data().count;
}

// Carga todos los IDs de una colección en un Set (para lookups O(1))
async function loadIdSet(db: admin.firestore.Firestore, col: string): Promise<Set<string>> {
  const set = new Set<string>();
  let cursor: admin.firestore.QueryDocumentSnapshot | null = null;
  const PAGE = 500;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let q = db.collection(col).select().limit(PAGE);
    if (cursor) q = q.startAfter(cursor);
    const snap = await q.get();
    snap.forEach((d) => set.add(d.id));
    if (snap.size < PAGE) break;
    cursor = snap.docs[snap.docs.length - 1];
  }
  return set;
}

// Itera una colección en páginas y llama cb() por cada doc
async function forEach(
  db: admin.firestore.Firestore,
  col: string,
  cb: (id: string, data: Record<string, unknown>) => void
): Promise<void> {
  let cursor: admin.firestore.QueryDocumentSnapshot | null = null;
  const PAGE = 400;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let q: admin.firestore.Query = db.collection(col).limit(PAGE);
    if (cursor) q = q.startAfter(cursor);
    const snap = await q.get();
    snap.forEach((d) => cb(d.id, d.data() as Record<string, unknown>));
    if (snap.size < PAGE) break;
    cursor = snap.docs[snap.docs.length - 1];
  }
}

// ── Sección 1: Conteos ─────────────────────────────────────────────────────

async function checkCounts(): Promise<CountRow[]> {
  log("§1 Conteos old vs new...");
  const pairs: Array<[string, string, string]> = [
    // [label, oldCollection, newCollection]
    ["paymentReasons",  "paymentReasons",  "finance_categories"],
    ["uselessReasons",  "uselessReasons",  "shrinkage_reasons"],
    ["users",           "users",           "users"],
    ["vehicles",        "vehicles",        "trucks"],
    ["products",        "products",        "products"],
    ["customers",       "customers",       "customers"],
    ["cashMovements",   "cashMovements",   "cashMovements"],
    ["distributions",   "distributions",   "dispatchManifests"],
    ["movements",       "movements",       "kardex_logs"],
    ["vouchers",        "vouchers",        "sales"],
  ];

  const rows: CountRow[] = [];
  for (const [entity, oldCol, newCol] of pairs) {
    const [oldCount, newCount] = await Promise.all([
      countCollection(oldDb, oldCol),
      countCollection(newDb, newCol),
    ]);
    const diff = newCount - oldCount;
    rows.push({ entity, oldCollection: oldCol, newCollection: newCol, oldCount, newCount, diff, match: diff === 0 });
    const icon = diff === 0 ? "✓" : "⚠️";
    log(`  ${icon}  ${entity.padEnd(20)} old=${oldCount} new=${newCount} diff=${diff >= 0 ? "+" : ""}${diff}`);
  }
  return rows;
}

// ── Sección 2: Integridad referencial ─────────────────────────────────────

async function checkReferentialIntegrity(): Promise<OrphanResult[]> {
  log("§2 Integridad referencial...");
  const results: OrphanResult[] = [];

  // Cargar sets de referencia
  log("  Cargando IDs de referencia...");
  const [customerIds, productIds, manifestIds, categoryIds] = await Promise.all([
    loadIdSet(newDb, "customers"),
    loadIdSet(newDb, "products"),
    loadIdSet(newDb, "dispatchManifests"),
    loadIdSet(newDb, "finance_categories"),
  ]);
  log(`  customers=${customerIds.size} products=${productIds.size} manifests=${manifestIds.size} categories=${categoryIds.size}`);

  // sales.customerId → customers
  {
    log("  Verificando sales.customerId...");
    const orphans: string[] = [];
    await forEach(newDb, "sales", (id, data) => {
      const cid = data.customerId as string;
      if (cid && !customerIds.has(cid)) orphans.push(`sale/${id} → customer/${cid}`);
    });
    results.push({
      entity: "sales",
      field: "customerId",
      referencedCollection: "customers",
      total: orphans.length,
      examples: orphans.slice(0, 20),
    });
    log(`  ${orphans.length === 0 ? "✓" : "⚠️"}  sales.customerId huérfanos: ${orphans.length}`);
  }

  // cashMovements.categoryId → finance_categories
  {
    log("  Verificando cashMovements.categoryId...");
    const orphans: string[] = [];
    await forEach(newDb, "cashMovements", (id, data) => {
      const cid = data.categoryId as string;
      if (cid && !categoryIds.has(cid)) orphans.push(`cashMovement/${id} → category/${cid}`);
    });
    results.push({
      entity: "cashMovements",
      field: "categoryId",
      referencedCollection: "finance_categories",
      total: orphans.length,
      examples: orphans.slice(0, 20),
    });
    log(`  ${orphans.length === 0 ? "✓" : "⚠️"}  cashMovements.categoryId huérfanos: ${orphans.length}`);
  }

  // kardex_logs.productId → products
  {
    log("  Verificando kardex_logs.productId...");
    const orphans: string[] = [];
    await forEach(newDb, "kardex_logs", (id, data) => {
      const pid = data.productId as string;
      if (pid && !productIds.has(pid)) orphans.push(`kardexLog/${id} → product/${pid}`);
    });
    results.push({
      entity: "kardex_logs",
      field: "productId",
      referencedCollection: "products",
      total: orphans.length,
      examples: orphans.slice(0, 20),
    });
    log(`  ${orphans.length === 0 ? "✓" : "⚠️"}  kardex_logs.productId huérfanos: ${orphans.length}`);
  }

  // dispatchManifests.driverId → users
  {
    log("  Verificando dispatchManifests.driverId...");
    const userIds = await loadIdSet(newDb, "users");
    const orphans: string[] = [];
    await forEach(newDb, "dispatchManifests", (id, data) => {
      const uid = data.driverId as string;
      if (uid && !userIds.has(uid)) orphans.push(`manifest/${id} → user/${uid}`);
    });
    results.push({
      entity: "dispatchManifests",
      field: "driverId",
      referencedCollection: "users",
      total: orphans.length,
      examples: orphans.slice(0, 20),
    });
    log(`  ${orphans.length === 0 ? "✓" : "⚠️"}  dispatchManifests.driverId huérfanos: ${orphans.length}`);
  }

  return results;
}

// ── Sección 3: Campos críticos no nulos ───────────────────────────────────

async function checkCriticalFields(): Promise<FieldIssue[]> {
  log("§3 Campos críticos...");
  const issues: FieldIssue[] = [];

  // customers: sin name o documentId vacío
  {
    log("  customers: name y documentId...");
    const noName: string[] = [];
    const noDocId: string[] = [];
    await forEach(newDb, "customers", (id, data) => {
      if (!data.name || (data.name as string).trim() === "") noName.push(id);
      if (!data.documentId || (data.documentId as string).trim() === "" || data.documentId === "123")
        noDocId.push(id);
    });
    if (noName.length > 0)
      issues.push({ collection: "customers", check: "name vacío/ausente", total: noName.length, examples: noName.slice(0, 10) });
    if (noDocId.length > 0)
      issues.push({ collection: "customers", check: "documentId vacío/placeholder '123'", total: noDocId.length, examples: noDocId.slice(0, 10) });
    log(`  noName=${noName.length}  noDocId(o placeholder)=${noDocId.length}`);
  }

  // sales: sin totalAmount o sin date
  {
    log("  sales: totalAmount y date...");
    const noAmount: string[] = [];
    const noDate: string[] = [];
    const negAmount: string[] = [];
    const paidGtTotal: string[] = [];
    await forEach(newDb, "sales", (id, data) => {
      const total = data.totalAmount as number;
      const paid  = data.paidAmount as number;
      if (total === null || total === undefined || isNaN(total)) noAmount.push(id);
      if (total < 0) negAmount.push(id);
      if (!data.date) noDate.push(id);
      if (typeof paid === "number" && typeof total === "number" && paid > total + 0.01)
        paidGtTotal.push(`sale/${id} paid=${paid} total=${total}`);
    });
    if (noAmount.length > 0)
      issues.push({ collection: "sales", check: "totalAmount ausente/NaN", total: noAmount.length, examples: noAmount.slice(0, 10) });
    if (noDate.length > 0)
      issues.push({ collection: "sales", check: "date ausente", total: noDate.length, examples: noDate.slice(0, 10) });
    if (negAmount.length > 0)
      issues.push({ collection: "sales", check: "totalAmount negativo", total: negAmount.length, examples: negAmount.slice(0, 10) });
    if (paidGtTotal.length > 0)
      issues.push({ collection: "sales", check: "paidAmount > totalAmount (inconsistente)", total: paidGtTotal.length, examples: paidGtTotal.slice(0, 10) });
    log(`  noAmount=${noAmount.length}  noDate=${noDate.length}  neg=${negAmount.length}  paidGtTotal=${paidGtTotal.length}`);
  }

  // cashMovements: amount nulo o NaN
  {
    log("  cashMovements: amount...");
    const bad: string[] = [];
    await forEach(newDb, "cashMovements", (id, data) => {
      const a = data.amount as number;
      if (a === null || a === undefined || isNaN(a) || a < 0)
        bad.push(`cashMovement/${id} amount=${a}`);
    });
    if (bad.length > 0)
      issues.push({ collection: "cashMovements", check: "amount nulo/NaN/negativo", total: bad.length, examples: bad.slice(0, 10) });
    log(`  amount problems=${bad.length}`);
  }

  // customers: debtAmount NaN o negativo
  {
    log("  customers: debtAmount...");
    const bad: string[] = [];
    await forEach(newDb, "customers", (id, data) => {
      const d = data.debtAmount as number;
      if (d === null || d === undefined || isNaN(d) || d < 0)
        bad.push(`customer/${id} debtAmount=${d}`);
    });
    if (bad.length > 0)
      issues.push({ collection: "customers", check: "debtAmount nulo/NaN/negativo", total: bad.length, examples: bad.slice(0, 10) });
    log(`  debtAmount problems=${bad.length}`);
  }

  return issues;
}

// ── Sección 4: Tipos y fechas ─────────────────────────────────────────────

async function checkTypes(): Promise<TypeIssue[]> {
  log("§4 Tipos y fechas...");
  const issues: TypeIssue[] = [];

  const dateFields: Array<[string, string[]]> = [
    ["customers",        ["createdAt", "updatedAt"]],
    ["sales",            ["date", "createdAt", "updatedAt"]],
    ["cashMovements",    ["date", "createdAt", "updatedAt"]],
    ["dispatchManifests",["dispatchDate", "createdAt", "updatedAt"]],
    ["kardex_logs",      ["createdAt"]],
    ["products",         ["createdAt", "updatedAt"]],
  ];

  const numFields: Array<[string, string[]]> = [
    ["customers",        ["debtAmount"]],
    ["sales",            ["totalAmount", "paidAmount"]],
    ["cashMovements",    ["amount"]],
    ["products",         ["priceFull", "priceRefill", "priceEmpty", "stockFilled", "stockEmpty"]],
  ];

  for (const [col, fields] of dateFields) {
    log(`  Fechas en ${col}...`);
    let checked = 0;
    await forEach(newDb, col, (id, data) => {
      if (checked >= 200) return; // muestra de los primeros 200
      for (const f of fields) {
        const val = data[f];
        if (val === undefined || val === null) continue;
        const isTs = val instanceof admin.firestore.Timestamp;
        const isStr = typeof val === "string";
        if (!isTs) {
          issues.push({ collection: col, field: f, expectedType: "Timestamp", foundType: isStr ? "string" : typeof val, docId: id, foundValue: isStr ? (val as string).slice(0, 30) : val });
        }
      }
      checked++;
    });
  }

  for (const [col, fields] of numFields) {
    log(`  Números en ${col}...`);
    let checked = 0;
    await forEach(newDb, col, (id, data) => {
      if (checked >= 200) return;
      for (const f of fields) {
        const val = data[f];
        if (val === undefined || val === null) continue;
        if (typeof val !== "number") {
          issues.push({ collection: col, field: f, expectedType: "number", foundType: typeof val, docId: id, foundValue: String(val).slice(0, 30) });
        }
      }
      checked++;
    });
  }

  log(`  Problemas de tipo encontrados: ${issues.length}`);
  return issues;
}

// ── Sección 5: Spot-check ─────────────────────────────────────────────────

async function spotCheck(): Promise<Array<Record<string, unknown>>> {
  log("§5 Spot-check clientes (5 muestras)...");
  const snap = await newDb.collection("customers").limit(5).get();
  const samples: Array<Record<string, unknown>> = [];
  snap.forEach((doc) => {
    const d = doc.data() as Record<string, unknown>;
    samples.push({ id: doc.id, ...anon(d) });
  });
  return samples;
}

// ── Reporte Markdown ───────────────────────────────────────────────────────

function buildReport(
  counts: CountRow[],
  orphans: OrphanResult[],
  fieldIssues: FieldIssue[],
  typeIssues: TypeIssue[],
  spotSamples: Array<Record<string, unknown>>,
  startedAt: Date
): string {
  const now = new Date();
  const elapsed = ((now.getTime() - startedAt.getTime()) / 1000).toFixed(1);

  const totalOrphans = orphans.reduce((s, o) => s + o.total, 0);
  const totalFieldIssues = fieldIssues.reduce((s, f) => s + f.total, 0);
  const totalTypeIssues = typeIssues.length;
  const countMismatches = counts.filter((r) => !r.match).length;

  let verdict: string;
  if (countMismatches === 0 && totalOrphans === 0 && totalFieldIssues === 0 && totalTypeIssues === 0) {
    verdict = "✅ OK — Migración íntegra. Sin anomalías detectadas.";
  } else if (countMismatches > 0 || totalOrphans > 100) {
    verdict = "❌ RE-MIGRAR — Hay diferencias de conteo o huérfanos masivos.";
  } else {
    verdict = "⚠️ REVISAR — Hay hallazgos menores que requieren revisión manual.";
  }

  const lines: string[] = [];
  lines.push(`# Reporte de Verificación de Migración`);
  lines.push(`\n**Fecha:** ${now.toISOString().slice(0, 19).replace("T", " ")}  `);
  lines.push(`**Proyecto viejo:** \`${oldProjectId}\`  `);
  lines.push(`**Proyecto nuevo:** \`${newProjectId}\`  `);
  lines.push(`**Tiempo de ejecución:** ${elapsed}s\n`);
  lines.push(`## Veredicto\n\n${verdict}\n`);
  lines.push(`---\n`);

  // §1 Conteos
  lines.push(`## §1 Conteos (viejo vs nuevo)\n`);
  lines.push(`| Entidad | Colección vieja | Colección nueva | #Viejo | #Nuevo | Diff | ¿Match? |`);
  lines.push(`|---|---|---|---:|---:|---:|:---:|`);
  for (const r of counts) {
    const sign = r.diff >= 0 ? "+" : "";
    const matchCell = r.match ? "✅" : "⚠️";
    lines.push(`| ${r.entity} | \`${r.oldCollection}\` | \`${r.newCollection}\` | ${r.oldCount} | ${r.newCount} | ${sign}${r.diff} | ${matchCell} |`);
  }
  const totalOld = counts.reduce((s, r) => s + r.oldCount, 0);
  const totalNew = counts.reduce((s, r) => s + r.newCount, 0);
  const totalDiff = totalNew - totalOld;
  lines.push(`| **TOTAL** | | | **${totalOld}** | **${totalNew}** | **${totalDiff >= 0 ? "+" : ""}${totalDiff}** | ${countMismatches === 0 ? "✅" : "⚠️"} |`);
  lines.push(``);

  // §2 Integridad referencial
  lines.push(`## §2 Integridad referencial\n`);
  if (totalOrphans === 0) {
    lines.push(`✅ Sin huérfanos detectados.\n`);
  } else {
    lines.push(`⚠️ Se detectaron referencias rotas.\n`);
    for (const o of orphans) {
      if (o.total === 0) continue;
      lines.push(`### ${o.entity}.${o.field} → ${o.referencedCollection}`);
      lines.push(`- **Total huérfanos:** ${o.total}`);
      if (o.examples.length > 0) {
        lines.push(`- **Ejemplos (máx 20):**`);
        o.examples.forEach((e) => lines.push(`  - \`${e}\``));
      }
      lines.push(``);
    }
  }

  // §3 Campos críticos
  lines.push(`## §3 Campos críticos\n`);
  if (fieldIssues.length === 0) {
    lines.push(`✅ Sin problemas en campos críticos.\n`);
  } else {
    lines.push(`⚠️ Se encontraron ${totalFieldIssues} registros con campos problemáticos.\n`);
    for (const fi of fieldIssues) {
      lines.push(`### ${fi.collection}: ${fi.check}`);
      lines.push(`- **Total:** ${fi.total}`);
      if (fi.examples.length > 0) {
        lines.push(`- **Ejemplos:**`);
        fi.examples.forEach((e) => lines.push(`  - \`${e}\``));
      }
      lines.push(``);
    }
  }

  // §4 Tipos
  lines.push(`## §4 Tipos y fechas\n`);
  if (typeIssues.length === 0) {
    lines.push(`✅ Todos los tipos son correctos en la muestra verificada.\n`);
  } else {
    lines.push(`⚠️ ${typeIssues.length} campos con tipo inesperado (muestra de primeros 200 docs por colección).\n`);
    lines.push(`| Colección | Campo | Esperado | Encontrado | Doc ID | Valor |`);
    lines.push(`|---|---|---|---|---|---|`);
    for (const ti of typeIssues.slice(0, 50)) {
      lines.push(`| \`${ti.collection}\` | \`${ti.field}\` | ${ti.expectedType} | ${ti.foundType} | \`${ti.docId}\` | \`${String(ti.foundValue).slice(0, 40)}\` |`);
    }
    if (typeIssues.length > 50) lines.push(`\n_(Se muestran los primeros 50 de ${typeIssues.length})_`);
    lines.push(``);
  }

  // §5 Spot-check
  lines.push(`## §5 Spot-check: 5 clientes (PII anonimizado)\n`);
  lines.push(`\`\`\`json`);
  lines.push(JSON.stringify(spotSamples, null, 2));
  lines.push(`\`\`\`\n`);

  lines.push(`---`);
  lines.push(`_Generado automáticamente por \`scripts/migration/verify-migration.ts\`_`);

  return lines.join("\n");
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const startedAt = new Date();
  console.log("\n╔══════════════════════════════════════╗");
  console.log("║   YACCO — VERIFICACIÓN MIGRACIÓN     ║");
  console.log("╚══════════════════════════════════════╝");
  console.log(`  Origen : ${oldProjectId}`);
  console.log(`  Destino: ${newProjectId}`);
  console.log(`  Modo   : SOLO LECTURA\n`);

  const counts     = await checkCounts();
  const orphans    = await checkReferentialIntegrity();
  const fieldIssues = await checkCriticalFields();
  const typeIssues = await checkTypes();
  const spotSamples = await spotCheck();

  // Resumen en consola
  const totalOrphans    = orphans.reduce((s, o) => s + o.total, 0);
  const totalFieldIssues = fieldIssues.reduce((s, f) => s + f.total, 0);
  const countMismatches = counts.filter((r) => !r.match).length;

  console.log("\n═══════════════════════════════════════");
  console.log("  RESUMEN FINAL");
  console.log("═══════════════════════════════════════");
  console.log(`  Conteos con mismatch : ${countMismatches === 0 ? "✅ 0" : `⚠️  ${countMismatches}`}`);
  console.log(`  Huérfanos totales    : ${totalOrphans === 0 ? "✅ 0" : `⚠️  ${totalOrphans}`}`);
  console.log(`  Campos críticos      : ${totalFieldIssues === 0 ? "✅ 0" : `⚠️  ${totalFieldIssues}`}`);
  console.log(`  Tipos incorrectos    : ${typeIssues.length === 0 ? "✅ 0" : `⚠️  ${typeIssues.length}`}`);

  let verdict: string;
  if (countMismatches === 0 && totalOrphans === 0 && totalFieldIssues === 0 && typeIssues.length === 0) {
    verdict = "✅ OK — Migración íntegra.";
  } else if (countMismatches > 0 || totalOrphans > 100) {
    verdict = "❌ RE-MIGRAR — Diferencias críticas detectadas.";
  } else {
    verdict = "⚠️ REVISAR — Hallazgos menores, revisar el reporte.";
  }
  console.log(`\n  Veredicto: ${verdict}\n`);

  // Escribir reporte Markdown
  const report = buildReport(counts, orphans, fieldIssues, typeIssues, spotSamples, startedAt);
  const reportPath = path.resolve(__dirname, "../../docs/migration/VERIFICATION-REPORT.md");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report, "utf8");
  console.log(`  Reporte guardado en: docs/migration/VERIFICATION-REPORT.md`);
  console.log("═══════════════════════════════════════\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error fatal:", err);
  process.exit(1);
});
