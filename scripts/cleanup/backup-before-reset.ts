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

      // NO cargar variables de emuladores para este script de producción
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
  const storageBucketName = (process.env.FIREBASE_STORAGE_BUCKET || "yacco-2026.firebasestorage.app")
    .replace("gs://", "");

  if (NEW_SA_PATH) {
    const resolvedPath = path.resolve(NEW_SA_PATH);
    if (!fs.existsSync(resolvedPath)) {
      console.error(`❌ ERROR: Archivo de credenciales no encontrado: ${resolvedPath}`);
      process.exit(1);
    }
    const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: storageBucketName
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
      storageBucket: storageBucketName
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
console.log("💾 YACCO — PRODUCTION BACKUP BEFORE RESET");
console.log(`🔌 Conectado a PRODUCCIÓN: "${projectId}"`);
console.log("=================================================\n");

// Listado de colecciones a respaldar
const COLLECTIONS_TO_BACKUP = [
  "sales",
  "cashMovements",
  "dispatchManifests",
  "kardexLogs",
  "productionBatches",
  "products",
  "financeCategories",
  "shrinkageReasons",
  "trucks",
  "users",
  "customers",
  "systemSettings"
];

// Helper recursivo de serialización de datos
function serializeData(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (obj instanceof admin.firestore.Timestamp) {
    return obj.toDate().toISOString();
  }

  if (typeof obj.toDate === "function") {
    return obj.toDate().toISOString();
  }

  if (
    typeof obj === "object" &&
    typeof obj._seconds === "number" &&
    typeof obj._nanoseconds === "number"
  ) {
    return new Date(obj._seconds * 1000).toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeData);
  }

  if (typeof obj === "object") {
    const res: any = {};
    for (const [key, val] of Object.entries(obj)) {
      res[key] = serializeData(val);
    }
    return res;
  }

  return obj;
}

// Realiza el backup paginado de una colección
async function backupCollection(colName: string, backupDir: string): Promise<number> {
  const collectionRef = db.collection(colName);
  let documentCount = 0;
  const allDocsData: any[] = [];

  // Paginación por lotes de 1000 documentos
  let query = collectionRef.orderBy("__name__").limit(1000);
  let lastDoc: admin.firestore.DocumentSnapshot | null = null;

  while (true) {
    let currentQuery = query;
    if (lastDoc) {
      currentQuery = query.startAfter(lastDoc);
    }

    const snapshot = await currentQuery.get();
    if (snapshot.empty) {
      break;
    }

    snapshot.docs.forEach((doc) => {
      allDocsData.push({
        id: doc.id,
        ...serializeData(doc.data())
      });
    });

    documentCount += snapshot.size;
    lastDoc = snapshot.docs[snapshot.size - 1];

    if (snapshot.size < 1000) {
      break;
    }
  }

  const filePath = path.join(backupDir, `${colName}.json`);
  fs.writeFileSync(filePath, JSON.stringify(allDocsData, null, 2), "utf8");
  console.log(`   ✓ Colección '${colName}': respaldados ${documentCount} documentos.`);
  return documentCount;
}

// Realiza el backup de Storage (manifiesto y descarga de archivos de sunat/)
async function backupStorage(backupDir: string): Promise<number> {
  console.log("⏳ Respaldando archivos de Storage bajo prefijo 'sunat/'...");
  const bucket = storage.bucket();
  const [files] = await bucket.getFiles({ prefix: "sunat/" });

  console.log(`   Archivos encontrados bajo 'sunat/': ${files.length}`);

  const manifest: any[] = [];
  const storageDir = path.join(backupDir, "storage_files");

  if (files.length > 0) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  for (const file of files) {
    const metadata = {
      name: file.name,
      size: Number(file.metadata.size || 0),
      contentType: file.metadata.contentType || "application/octet-stream",
      updated: file.metadata.updated || new Date().toISOString(),
      generation: file.metadata.generation || ""
    };
    manifest.push(metadata);

    // Descarga de archivos
    try {
      const safeName = file.name.replace(/\//g, "_");
      const localFilePath = path.join(storageDir, safeName);
      await file.download({ destination: localFilePath });
    } catch (err) {
      console.error(`   ⚠️ No se pudo descargar el archivo ${file.name}:`, err);
    }
  }

  const manifestPath = path.join(backupDir, "storage-manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`   ✓ Manifiesto de Storage guardado.`);
  return files.length;
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.resolve(process.cwd(), `scripts/cleanup/backup-${timestamp}`);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log(`📂 Creando directorio de respaldo local: ${backupDir}\n`);

  const firestoreSummary: Record<string, number> = {};

  // 1. Ejecutar Backup de Firestore
  console.log("⏳ Respaldando colecciones de Firestore...");
  for (const col of COLLECTIONS_TO_BACKUP) {
    try {
      const count = await backupCollection(col, backupDir);
      firestoreSummary[col] = count;
    } catch (err) {
      console.error(`   ❌ Error al respaldar la colección '${col}':`, err);
      firestoreSummary[col] = -1;
    }
  }
  console.log("");

  // 2. Ejecutar Backup de Storage
  let storageFileCount = 0;
  try {
    storageFileCount = await backupStorage(backupDir);
  } catch (err) {
    console.error("   ❌ Error al respaldar archivos de Storage:", err);
  }

  // 3. Resumen Final
  console.log("\n=================================================");
  console.log("📊 RESUMEN DEL RESPALDO");
  console.log("=================================================");
  console.log("Firestore (Colección -> Documentos):");
  for (const [col, count] of Object.entries(firestoreSummary)) {
    const status = count >= 0 ? `${count} docs` : "⚠️ ERROR";
    console.log(`   ➔ ${col.padEnd(20)}: ${status}`);
  }
  console.log(`\nStorage (sunat/):`);
  console.log(`   ➔ Archivos descargados  : ${storageFileCount}`);
  console.log(`\nRuta del Backup Local:`);
  console.log(`   ➔ ${backupDir}`);
  console.log("=================================================\n");
  console.log("✅ Proceso de lectura terminado. Ningún dato fue modificado en la nube.");
}

main().catch((err) => {
  console.error("❌ Fallo en el script de respaldo:", err);
  process.exit(1);
});
