import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

// Helper to load environment variables from .env.local
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
      
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

loadEnvLocal();

const isEmulator = process.env.FIRESTORE_EMULATOR_HOST;
const NEW_SA_PATH = process.env.NEW_SA_PATH;

if (!admin.apps.length) {
  if (isEmulator) {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || "demo-project",
    });
  } else if (NEW_SA_PATH) {
    const resolvedPath = path.resolve(NEW_SA_PATH);
    if (!fs.existsSync(resolvedPath)) {
      console.error(`❌ Service account file not found: ${resolvedPath}`);
      process.exit(1);
    }
    const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const rawKey = process.env.FIREBASE_PRIVATE_KEY ?? "";
    const privateKey = rawKey.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey.includes("BEGIN PRIVATE KEY")) {
      console.error("❌ Firebase Admin credentials are incomplete.");
      process.exit(1);
    }
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  }
}

const db = admin.firestore();

const oldCollections = [
  "finance_categories",
  "shrinkage_reasons",
  "settings_categories"
];

async function deleteCollection(collectionPath: string, isCommit: boolean) {
  const collectionRef = db.collection(collectionPath);
  const snapshot = await collectionRef.get();
  
  console.log(`📂 Old Collection: '${collectionPath}'`);
  console.log(`   Found ${snapshot.size} documents targeted for deletion.`);

  if (snapshot.empty) {
    console.log(`   Nothing to delete in '${collectionPath}'.\n`);
    return;
  }

  if (!isCommit) {
    console.log(`   [DRY-RUN] Would delete ${snapshot.size} documents.\n`);
    return;
  }

  let batch = db.batch();
  let batchCount = 0;
  let deletedCount = 0;

  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
    batchCount++;
    deletedCount++;

    if (batchCount === 500) {
      console.log(`   Committing batch of 500 deletions...`);
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    console.log(`   Committing final batch of ${batchCount} deletions...`);
    await batch.commit();
  }

  console.log(`   ✅ Successfully deleted ${deletedCount} documents from '${collectionPath}'.\n`);
}

async function run() {
  const args = process.argv.slice(2);
  const isCommit = args.includes("--commit");

  console.log("=========================================");
  console.log("🗑️ DELETION OF LEGACY FIRESTORE COLLECTIONS");
  console.log(`Mode: ${isCommit ? "🚨 COMMIT (DELETING FROM DB)" : "🔍 DRY-RUN (Read-Only)"}`);
  console.log("=========================================\n");

  for (const col of oldCollections) {
    await deleteCollection(col, isCommit);
  }

  if (!isCommit) {
    console.log("💡 Dry-run finished. No data was deleted from the database.");
    console.log("💡 To execute the actual deletion, run with the '--commit' flag.\n");
  } else {
    console.log("✅ Legacy collection deletion finished successfully.");
  }
}

run().catch((err) => {
  console.error("❌ Deletion process failed:", err);
  process.exit(1);
});
