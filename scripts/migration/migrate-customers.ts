import admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

/**
 * MIGRATION EXECUTION: CUSTOMERS
 * 
 * Target: Production (yacco-2026)
 * Strategy: Additive update.
 * 
 * Requires --commit flag to actually write.
 */

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
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadEnvLocal();

// SAFETY CHECKS
if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.error("❌ ERROR: Firestore emulator detected. This script is for PRODUCTION.");
  process.exit(1);
}

if (!admin.apps.length) {
  const NEW_SA_PATH = process.env.NEW_SA_PATH;
  if (NEW_SA_PATH) {
    const serviceAccount = JSON.parse(fs.readFileSync(path.resolve(NEW_SA_PATH), "utf8"));
    if (serviceAccount.project_id !== "yacco-2026") {
      console.error(`❌ ERROR: Project mismatch. Expected yacco-2026, got ${serviceAccount.project_id}`);
      process.exit(1);
    }
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    if (process.env.FIREBASE_PROJECT_ID !== "yacco-2026") {
      console.error(`❌ ERROR: Project mismatch. Expected yacco-2026, got ${process.env.FIREBASE_PROJECT_ID}`);
      process.exit(1);
    }
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
const shouldCommit = process.argv.includes("--commit");

function getDocumentType(docId: string): "DNI" | "RUC" | "OTHER" {
  const cleanId = String(docId || "").trim();
  if (/^\d{8}$/.test(cleanId)) return "DNI";
  if (/^\d{11}$/.test(cleanId)) return "RUC";
  return "OTHER";
}

async function main() {
  console.log("🚀 Starting CUSTOMER migration in yacco-2026...");
  if (!shouldCommit) {
    console.log("⚠️  RUNNING IN DRY-RUN MODE. Pass --commit to write changes.");
  } else {
    console.log("🔥 COMMIT MODE ENABLED. Changes will be written to PRODUCTION.");
  }

  const snap = await db.collection("customers").get();
  const docs = snap.docs;
  const total = docs.length;
  console.log(`🔍 Found ${total} customers.`);

  let processed = 0;
  let updated = 0;
  const BATCH_SIZE = 400;
  
  let batch = db.batch();
  let batchCount = 0;

  for (const doc of docs) {
    const data = doc.data();
    const docId = data.documentId || "";
    
    const updatePayload: any = {
      documentNumber: docId,
      documentType: getDocumentType(docId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Locations mapping
    const originalLocations = data.locations || [];
    updatePayload.locations = originalLocations.map((loc: any) => ({
      ...loc,
      isMain: loc.isDefault === true
    }));

    // customPrices mapping
    if (data.customPrices && typeof data.customPrices === 'object' && !Array.isArray(data.customPrices)) {
      updatePayload.customPrices = [];
    }

    if (shouldCommit) {
      batch.update(doc.ref, updatePayload);
      batchCount++;
      updated++;

      if (batchCount >= BATCH_SIZE) {
        console.log(`📦 Committing batch of ${batchCount}... (${updated}/${total})`);
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }

    processed++;
  }

  // Final batch
  if (shouldCommit && batchCount > 0) {
    console.log(`📦 Committing final batch of ${batchCount}... (${updated}/${total})`);
    await batch.commit();
  }

  console.log("\n✅ DONE:");
  console.log(`   - Total customers scanned: ${processed}`);
  if (shouldCommit) {
    console.log(`   - Total updated in DB   : ${updated}`);
  } else {
    console.log(`   - Simulated updates      : ${processed}`);
    console.log("   - (No changes were written because --commit was missing)");
  }
}

main().catch(console.error);
