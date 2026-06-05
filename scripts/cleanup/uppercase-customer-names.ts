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

const nameFields = ["name", "fullName", "businessName"];

interface ConversionExample {
  docId: string;
  field: string;
  before: string;
  after: string;
}

function anonymizeName(val: string): string {
  if (val.length <= 4) return val;
  const first = val.slice(0, 2);
  const last = val.slice(-2);
  return `${first}***${last}`;
}

async function run() {
  const args = process.argv.slice(2);
  const isCommit = args.includes("--commit");

  console.log("=========================================");
  console.log("🔠 CUSTOMER NAME UPPERCASE CONVERSION");
  console.log(`Mode: ${isCommit ? "🚨 COMMIT (Writing to DB)" : "🔍 DRY-RUN (Read-Only)"}`);
  console.log("=========================================\n");

  console.log("🔍 Fetching all customers...");
  const snapshot = await db.collection("customers").get();
  console.log(`   Found ${snapshot.size} total customers.`);

  if (snapshot.empty) {
    console.log("🎉 No customers found. Exiting.");
    process.exit(0);
  }

  const detectedFields = new Set<string>();
  const examples: ConversionExample[] = [];
  const updateTargets: Array<{ docRef: admin.firestore.DocumentReference; updates: Record<string, string> }> = [];
  
  let skipCount = 0;
  let updateCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const docId = doc.id;
    const updates: Record<string, string> = {};
    let needsChange = false;

    for (const field of nameFields) {
      const val = data[field];
      if (typeof val === "string" && val.trim() !== "") {
        detectedFields.add(field);
        
        // Convert to uppercase
        const upperVal = val.toUpperCase();
        
        if (val !== upperVal) {
          updates[field] = upperVal;
          needsChange = true;
          
          if (examples.length < 15) {
            examples.push({
              docId,
              field,
              before: val,
              after: upperVal
            });
          }
        }
      }
    }

    if (needsChange) {
      updateCount++;
      updateTargets.push({
        docRef: doc.ref,
        updates
      });
    } else {
      skipCount++;
    }
  }

  console.log("\n📊 Analysis Results:");
  console.log(`   ➔ Detected name fields: ${Array.from(detectedFields).join(", ")}`);
  console.log(`   ➔ Total customers analyzed: ${snapshot.size}`);
  console.log(`   ➔ Already in uppercase (skipped): ${skipCount}`);
  console.log(`   ➔ Requiring casing update: ${updateCount}`);

  if (updateCount === 0) {
    console.log("\n🎉 All customer names are already in uppercase. No changes needed.");
    process.exit(0);
  }

  // Display examples
  console.log("\n📝 Conversion Examples (anonymized):");
  console.log(
    "| " +
    "Doc ID".padEnd(22) + " | " +
    "Field".padEnd(14) + " | " +
    "Before".padEnd(30) + " | " +
    "After".padEnd(30) + " |"
  );
  console.log(
    "|-" + "-".repeat(22) + "-|-" + "-".repeat(14) + "-|-" + "-".repeat(30) + "-|-" + "-".repeat(30) + "-|"
  );

  examples.slice(0, 10).forEach(ex => {
    console.log(
      "| " +
      ex.docId.padEnd(22) + " | " +
      ex.field.padEnd(14) + " | " +
      anonymizeName(ex.before).padEnd(30) + " | " +
      anonymizeName(ex.after).padEnd(30) + " |"
    );
  });
  console.log("-----------------------------------------------------------------------------------------\n");

  if (!isCommit) {
    console.log("💡 Dry-run finished. No data was written to the database.");
    console.log("💡 Run with '--commit' to execute uppercase conversion on Firestore.\n");
    process.exit(0);
  }

  // Execute Commit
  console.log("🚨 Proceeding to update customer names in Firestore batches...");
  
  let batch = db.batch();
  let batchSize = 0;
  let commitCount = 0;

  for (const target of updateTargets) {
    batch.update(target.docRef, {
      ...target.updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    batchSize++;
    commitCount++;

    if (batchSize === 500) {
      console.log(`   Committing batch of 500 updates...`);
      await batch.commit();
      batch = db.batch();
      batchSize = 0;
    }
  }

  if (batchSize > 0) {
    console.log(`   Committing final batch of ${batchSize} updates...`);
    await batch.commit();
  }

  console.log(`\n✅ Casing conversion finished successfully.`);
  console.log(`   ➔ Total updated documents: ${commitCount}\n`);
}

run().catch((err) => {
  console.error("❌ Conversion script failed:", err);
  process.exit(1);
});
