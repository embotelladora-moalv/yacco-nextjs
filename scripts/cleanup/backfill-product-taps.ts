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

async function run() {
  const args = process.argv.slice(2);
  const isCommit = args.includes("--commit");

  console.log("=========================================");
  console.log("🏺 PRODUCT HASTAP BACKFILL MIGRATION");
  console.log(`Mode: ${isCommit ? "🚨 COMMIT (Writing to DB)" : "🔍 DRY-RUN (Read-Only)"}`);
  console.log("=========================================\n");

  console.log("🔍 Fetching all products...");
  const snapshot = await db.collection("products").get();
  console.log(`   Found ${snapshot.size} total products.\n`);

  if (snapshot.empty) {
    console.log("🎉 No products found. Exiting.");
    process.exit(0);
  }

  interface LogRow {
    docId: string;
    sku: string;
    name: string;
    currentHasTap: string;
    inferredHasTap: string;
    action: string;
    ref: admin.firestore.DocumentReference;
  }

  const rows: LogRow[] = [];
  let updateCount = 0;
  let skipCount = 0;
  let reviewCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const docId = doc.id;
    const sku = data.sku || "";
    const name = data.name || "Unknown";
    const current = data.hasTap;

    // Apply inference rules:
    const parts = sku.split("-");
    let inferred: boolean | null = null;
    if (parts[0] === "BID") {
      if (parts[2] === "C") {
        inferred = true;
      } else if (parts[2] === "N") {
        inferred = false;
      }
    }

    let action = "SKIP (Already correct)";
    if (inferred === null) {
      action = "REVIEW (Manual check required)";
      reviewCount++;
    } else if (current !== inferred) {
      action = `UPDATE to ${inferred}`;
      updateCount++;
    } else {
      skipCount++;
    }

    rows.push({
      docId,
      sku,
      name,
      currentHasTap: current === undefined ? "undefined" : String(current),
      inferredHasTap: inferred === null ? "null (REVIEW)" : String(inferred),
      action,
      ref: doc.ref
    });
  }

  // Print results table
  console.log(
    "| " +
    "SKU".padEnd(16) + " | " +
    "Name".padEnd(30) + " | " +
    "Current".padEnd(10) + " | " +
    "Inferred".padEnd(15) + " | " +
    "Action".padEnd(30) + " |"
  );
  console.log(
    "|-" + "-".repeat(16) + "-|-" + "-".repeat(30) + "-|-" + "-".repeat(10) + "-|-" + "-".repeat(15) + "-|-" + "-".repeat(30) + "-|"
  );

  rows.forEach(r => {
    console.log(
      "| " +
      r.sku.padEnd(16) + " | " +
      r.name.slice(0, 30).padEnd(30) + " | " +
      r.currentHasTap.padEnd(10) + " | " +
      r.inferredHasTap.padEnd(15) + " | " +
      r.action.padEnd(30) + " |"
    );
  });
  console.log("------------------------------------------------------------------------------------------------------\n");

  console.log("📊 Summary:");
  console.log(`   ➔ Total products: ${snapshot.size}`);
  console.log(`   ➔ Requiring update: ${updateCount}`);
  console.log(`   ➔ Skipping (already correct): ${skipCount}`);
  console.log(`   ➔ Requiring review (null): ${reviewCount}\n`);

  if (updateCount === 0) {
    console.log("🎉 No products require updates. Exiting.");
    process.exit(0);
  }

  if (!isCommit) {
    console.log("💡 Dry-run finished. No data was written to the database.");
    console.log("💡 To execute, run this script with the '--commit' flag.\n");
    process.exit(0);
  }

  console.log("🚨 Seteando hasTap en batch...");
  const batch = db.batch();
  let commitCount = 0;

  for (const row of rows) {
    if (row.action.startsWith("UPDATE")) {
      const parts = row.sku.split("-");
      let inferredVal: boolean | null = null;
      if (parts[0] === "BID") {
        if (parts[2] === "C") {
          inferredVal = true;
        } else if (parts[2] === "N") {
          inferredVal = false;
        }
      }

      batch.update(row.ref, {
        hasTap: inferredVal,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      commitCount++;
    }
  }

  if (commitCount > 0) {
    await batch.commit();
    console.log(`✅ Batch update completed. Seteados ${commitCount} productos.`);
  } else {
    console.log("🎉 No se requirieron escrituras.");
  }
}

run().catch((err) => {
  console.error("❌ Backfill failed:", err);
  process.exit(1);
});
