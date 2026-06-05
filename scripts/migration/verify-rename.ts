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

const verificationTargets = [
  { oldCol: "finance_categories", newCol: "financeCategories" },
  { oldCol: "shrinkage_reasons", newCol: "shrinkageReasons" },
  { oldCol: "settings_categories", newCol: "settingsCategories" }
];

async function run() {
  console.log("=========================================");
  console.log("🔍 MIGRATION VERIFICATION (READ-ONLY)");
  console.log("=========================================\n");

  let verificationFailed = false;

  for (const target of verificationTargets) {
    console.log(`📋 Verifying: ${target.oldCol} ➔ ${target.newCol}`);
    
    // 1. Get counts
    const oldSnap = await db.collection(target.oldCol).count().get();
    const newSnap = await db.collection(target.newCol).count().get();
    
    const oldCount = oldSnap.data().count;
    const newCount = newSnap.data().count;
    
    console.log(`   Count old: ${oldCount}`);
    console.log(`   Count new: ${newCount}`);
    
    if (oldCount !== newCount) {
      console.error(`   ❌ ERROR: Count mismatch! ${oldCount} !== ${newCount}`);
      verificationFailed = true;
    } else {
      console.log(`   ✅ Count match!`);
    }

    // 2. Spot-check 3 docs
    if (newCount > 0) {
      console.log(`   Spot-checking 3 documents from '${target.newCol}':`);
      const sampleSnap = await db.collection(target.newCol).limit(3).get();
      
      for (const doc of sampleSnap.docs) {
        const docId = doc.id;
        const data = doc.data();
        const keys = Object.keys(data).join(", ");
        
        // Check if the exact doc exists in the old collection
        const oldDocSnap = await db.collection(target.oldCol).doc(docId).get();
        if (!oldDocSnap.exists) {
          console.error(`   ❌ ERROR: Document '${docId}' exists in new collection but not in old!`);
          verificationFailed = true;
        } else {
          console.log(`   - Doc ID: ${docId}`);
          console.log(`     Fields: [${keys}]`);
        }
      }
    }
    console.log("-----------------------------------------\n");
  }

  if (verificationFailed) {
    console.error("❌ VERIFICATION FAILED: Some counts or documents mismatched.");
    process.exit(1);
  } else {
    console.log("🎉 ALL VERIFICATIONS PASSED SUCCESSFULLY!");
    console.log("   Counts match and spot-checks are 100% accurate.");
  }
}

run().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
