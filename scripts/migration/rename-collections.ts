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
    console.log("🔌 Connecting to Firestore Emulator...");
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || "demo-project",
    });
  } else if (NEW_SA_PATH) {
    const resolvedPath = path.resolve(NEW_SA_PATH);
    if (!fs.existsSync(resolvedPath)) {
      console.error(`❌ Service account file not found: ${resolvedPath}`);
      process.exit(1);
    }
    console.log(`🔑 Authenticating using service account key file from: ${resolvedPath}`);
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
    console.log(`🔑 Authenticating using environment variables for project: ${projectId}`);
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  }
}

const db = admin.firestore();

const collectionsToMigrate = [
  { oldName: "finance_categories", newName: "financeCategories" },
  { oldName: "shrinkage_reasons", newName: "shrinkageReasons" },
  { oldName: "settings_categories", newName: "settingsCategories" } // 0 docs in DB, included for completeness
];

async function run() {
  const args = process.argv.slice(2);
  const isCommit = args.includes("--commit");
  
  console.log("=========================================");
  console.log("🚀 FIRESTORE COLLECTION DATA MIGRATION");
  console.log(`Mode: ${isCommit ? "🚨 COMMIT (Writing to DB)" : "🔍 DRY-RUN (Read-Only)"}`);
  console.log("=========================================\n");

  for (const mapping of collectionsToMigrate) {
    console.log(`📂 Processing: ${mapping.oldName} ➔ ${mapping.newName}`);
    
    const oldColRef = db.collection(mapping.oldName);
    const newColRef = db.collection(mapping.newName);

    // 1. Fetch all documents from the old collection
    const snapshot = await oldColRef.get();
    console.log(`   Found ${snapshot.size} documents in old collection '${mapping.oldName}'.`);

    if (snapshot.empty) {
      console.log(`   No documents to copy for ${mapping.oldName}.\n`);
      continue;
    }

    // 2. Fetch existing document IDs in the new collection for idempotency check
    const existingSnapshot = await newColRef.select().get();
    const existingIds = new Set<string>(existingSnapshot.docs.map(doc => doc.id));
    if (existingIds.size > 0) {
      console.log(`   Found ${existingIds.size} existing documents in new collection '${mapping.newName}'.`);
    }

    let copyCount = 0;
    let skipCount = 0;

    let batch = db.batch();
    let batchSize = 0;

    for (const doc of snapshot.docs) {
      const docId = doc.id;
      const data = doc.data();

      // Idempotency check: Skip if it already exists in the target collection
      if (existingIds.has(docId)) {
        skipCount++;
        continue;
      }

      copyCount++;

      if (isCommit) {
        batch.set(newColRef.doc(docId), data);
        batchSize++;

        if (batchSize === 500) {
          console.log(`   Submitting batch of 500 writes to '${mapping.newName}'...`);
          await batch.commit();
          batch = db.batch();
          batchSize = 0;
        }
      }
    }

    // Commit any remaining writes in the batch
    if (isCommit && batchSize > 0) {
      console.log(`   Submitting final batch of ${batchSize} writes to '${mapping.newName}'...`);
      await batch.commit();
    }

    console.log(`   Migration Summary for ${mapping.oldName}:`);
    console.log(`   ➔ Total documents: ${snapshot.size}`);
    console.log(`   ➔ Copied: ${copyCount}`);
    console.log(`   ➔ Skipped (already exist): ${skipCount}`);
    console.log(`-----------------------------------------\n`);
  }

  if (!isCommit) {
    console.log("💡 Dry-run finished. No data was written to the database.");
    console.log("💡 To execute the migration, run the script with the '--commit' flag.\n");
  } else {
    console.log("✅ Data copying finished successfully.");
  }
}

run().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
