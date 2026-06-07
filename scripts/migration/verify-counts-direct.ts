import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

// Load environment variables from .env.local
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

// Force disable emulators
delete process.env.FIRESTORE_EMULATOR_HOST;
delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
delete process.env.FIREBASE_STORAGE_EMULATOR_HOST;

if (!admin.apps.length) {
  const NEW_SA_PATH = process.env.NEW_SA_PATH;
  if (NEW_SA_PATH) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(fs.readFileSync(path.resolve(NEW_SA_PATH), "utf8")))
    });
  } else {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
      })
    });
  }
}

const db = admin.firestore();
const projectId = admin.app().options.projectId;

console.log(`🔌 Connected to project: "${projectId}"`);

const COLLECTIONS = [
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

async function main() {
  console.log("⏳ Fetching direct sizes using .get() for all collections...");
  
  for (const col of COLLECTIONS) {
    try {
      const snap = await db.collection(col).get();
      console.log(`   ➔ ${col.padEnd(20)}: ${snap.size} docs`);
    } catch (err: any) {
      console.error(`   ❌ Error fetching '${col}':`, err.message);
    }
  }
}

main().catch(console.error);
