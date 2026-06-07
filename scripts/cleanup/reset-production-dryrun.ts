import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

// 1. Cargar Variables de Entorno desde .env.local
function loadEnvLocal() {
  const envLocalPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envLocalPath)) {
    const content = fs.readFileSync(envLocalPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index === -1) continue;
      const key = trimmed.slice(0, index).trim();
      let val = trimmed.slice(index + 1).trim();
      
      if (
        (val.startsWith('"') && val.endsWith('"')) || 
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      
      // NO cargar variables de emuladores para conectarse a producción real
      if (
        key === "FIRESTORE_EMULATOR_HOST" ||
        key === "FIREBASE_AUTH_EMULATOR_HOST" ||
        key === "FIREBASE_STORAGE_EMULATOR_HOST"
      ) {
        continue;
      }
      
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

loadEnvLocal();

// Forzar la desactivación de emuladores en process.env por seguridad
delete process.env.FIRESTORE_EMULATOR_HOST;
delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
delete process.env.FIREBASE_STORAGE_EMULATOR_HOST;

const isEmulator = process.env.FIRESTORE_EMULATOR_HOST;
const NEW_SA_PATH = process.env.NEW_SA_PATH;

if (isEmulator) {
  console.error("❌ ERROR: Detectado emulador (FIRESTORE_EMULATOR_HOST). Abortando.");
  console.error("   Este script está diseñado exclusivamente para ejecutarse en PRODUCCIÓN.");
  process.exit(1);
}

if (!admin.apps.length) {
  if (NEW_SA_PATH) {
    const resolvedPath = path.resolve(NEW_SA_PATH);
    if (!fs.existsSync(resolvedPath)) {
      console.error(`❌ ERROR: Archivo de credenciales no encontrado: ${resolvedPath}`);
      process.exit(1);
    }
    const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: (process.env.FIREBASE_STORAGE_BUCKET || "yacco-2026.firebasestorage.app").replace("gs://", "")
    });
  } else {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const rawKey = process.env.FIREBASE_PRIVATE_KEY ?? "";
    const privateKey = rawKey.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey.includes("BEGIN PRIVATE KEY")) {
      console.error("❌ ERROR: Credenciales de Firebase Admin incompletas en .env.local.");
      process.exit(1);
    }
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      storageBucket: (process.env.FIREBASE_STORAGE_BUCKET || "yacco-2026.firebasestorage.app").replace("gs://", "")
    });
  }
}

const db = admin.firestore();
const storage = admin.storage();
const projectId = admin.app().options.projectId ?? process.env.FIREBASE_PROJECT_ID;

if (projectId !== "yacco-2026") {
  console.error(`❌ ERROR: El proyecto destino es "${projectId}", pero se requiere "yacco-2026". Abortando.`);
  process.exit(1);
}

console.log("=================================================");
console.log("🔍 DRY-RUN (simulación) — Conectado a PRODUCCIÓN: yacco-2026");
console.log("=================================================\n");

// 2. Definición del Plan del Reset como Constantes Claras
const COLLECTIONS_TO_DELETE = [
  "sales",
  "cashMovements",
  "dispatchManifests",
  "kardexLogs",
  "productionBatches",
  "products",
  "financeCategories",
  "shrinkageReasons",
  "trucks",
  "users"
];

const COLLECTIONS_TO_PRESERVE = ["customers", "systemSettings"];

const CUSTOMER_RESET_FIELDS = {
  debtAmount: 0,
  monetaryDebt: 0,
  containerBalances: [],
  loanedItems: {},
  lastSaleDate: null,
  stats: { loanedBottles: 0, totalSales: 0 }
};

const STORAGE_PREFIX_TO_DELETE = "sunat/";

async function runSimulation() {
  let totalDocsToDelete = 0;
  const deleteSummary: Record<string, number> = {};

  // a. Simular borrado de colecciones
  console.log("⏳ Calculando documentos a borrar por colección...");
  for (const colName of COLLECTIONS_TO_DELETE) {
    try {
      const countSnapshot = await db.collection(colName).count().get();
      const docCount = countSnapshot.data().count;
      deleteSummary[colName] = docCount;
      totalDocsToDelete += docCount;
      console.log(`   ➔ BORRARÍA: ${colName.padEnd(20)} -> ${docCount} documentos`);
    } catch (err) {
      console.error(`   ❌ Error al contar colección '${colName}':`, err);
      deleteSummary[colName] = -1;
    }
  }
  console.log("");

  // b. Simular reset de Customers
  console.log("⏳ Calculando clientes a resetear...");
  let customerCount = 0;
  try {
    const countSnapshot = await db.collection("customers").count().get();
    customerCount = countSnapshot.data().count;
    console.log(`   ➔ RESETEARÍA: customers. Documentos a actualizar: ${customerCount}`);
    
    // Inspeccionar una muestra de 3 clientes reales
    const sampleSnapshot = await db.collection("customers").limit(3).get();
    console.log("\n   📝 Inspección de campos existentes en una muestra de clientes:");
    if (sampleSnapshot.empty) {
      console.log("      No se encontraron clientes para la muestra.");
    } else {
      let idx = 0;
      sampleSnapshot.forEach((doc) => {
        const data = doc.data();
        const existingFields: string[] = [];
        const missingFields: string[] = [];

        for (const fieldName of Object.keys(CUSTOMER_RESET_FIELDS)) {
          if (fieldName in data) {
            existingFields.push(fieldName);
          } else {
            missingFields.push(fieldName);
          }
        }
        console.log(`      [Cliente ${idx + 1}] ID: ${doc.id}`);
        console.log(`         - Campos que SÍ existen en el doc: [${existingFields.join(", ")}]`);
        console.log(`         - Campos que NO existen (ausentes) : [${missingFields.join(", ")}]`);
        idx++;
      });
    }
  } catch (err) {
    console.error("   ❌ Error al analizar la colección 'customers':", err);
  }
  console.log("");

  // c. Reportar conservación intacta de systemSettings
  console.log("⏳ Analizando colecciones a conservar intactas...");
  for (const colName of COLLECTIONS_TO_PRESERVE) {
    if (colName === "customers") continue; // Ya se reportó su reset de campos
    try {
      const countSnapshot = await db.collection(colName).count().get();
      const docCount = countSnapshot.data().count;
      console.log(`   ➔ CONSERVA INTACTO: ${colName.padEnd(17)} -> ${docCount} documentos`);
    } catch (err) {
      console.error(`   ❌ Error al analizar la colección '${colName}':`, err);
    }
  }
  console.log("");

  // d. Simular borrado de Storage
  console.log(`⏳ Analizando Storage con prefijo '${STORAGE_PREFIX_TO_DELETE}'...`);
  let storageFileCount = 0;
  try {
    const bucket = storage.bucket();
    const [files] = await bucket.getFiles({ prefix: STORAGE_PREFIX_TO_DELETE });
    storageFileCount = files.length;
    console.log(`   ➔ BORRARÍA: ${storageFileCount} archivos de Storage`);
  } catch (err) {
    console.error("   ❌ Error al analizar archivos de Storage:", err);
  }

  // 4. Reporte final tipo tabla
  console.log("\n=================================================");
  console.log("📊 PLAN DE RESET — RESUMEN DE LA SIMULACIÓN");
  console.log("=================================================");
  console.log(
    "| " +
    "Operación".padEnd(20) + " | " +
    "Colección/Prefijo".padEnd(22) + " | " +
    "Cantidad".padEnd(10) + " |"
  );
  console.log(
    "|-" + "-".repeat(20) + "-|-" + "-".repeat(22) + "-|-" + "-".repeat(10) + "-|"
  );
  console.log(
    "| " +
    "BORRAR COMPLETO".padEnd(20) + " | " +
    "10 Colecciones raíz".padEnd(22) + " | " +
    `${totalDocsToDelete} docs`.padEnd(10) + " |"
  );
  console.log(
    "| " +
    "RESETEAR CAMPOS".padEnd(20) + " | " +
    "customers".padEnd(22) + " | " +
    `${customerCount} docs`.padEnd(10) + " |"
  );
  console.log(
    "| " +
    "CONSERVAR INTACTO".padEnd(20) + " | " +
    "systemSettings".padEnd(22) + " | " +
    "1 doc".padEnd(10) + " |"
  );
  console.log(
    "| " +
    "ELIMINAR ARCHIVOS".padEnd(20) + " | " +
    `gs://..${STORAGE_PREFIX_TO_DELETE}`.padEnd(22) + " | " +
    `${storageFileCount} files`.padEnd(10) + " |"
  );
  console.log("-------------------------------------------------\n");
  console.log("⚠️  ESTO ES UNA SIMULACIÓN. No se modificó nada.");
  console.log("   Para ejecutar el reset real se usará el script de FASE 3 con flag --commit.\n");
  console.log("=================================================");
}

runSimulation().catch((err) => {
  console.error("❌ Fallo en la simulación:", err);
  process.exit(1);
});
