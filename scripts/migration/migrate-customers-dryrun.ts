import admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

/**
 * MIGRATION DRY-RUN: CUSTOMERS
 * 
 * Target: Production (yacco-2026)
 * Strategy: Additive. Calculate new fields without writing.
 * 
 * Fields to calculate:
 * - documentNumber: alias of documentId
 * - documentType: "DNI" (8 digits), "RUC" (11 digits), "OTHER" (anything else)
 * - locations[].isMain: copy of isDefault
 * - customPrices: [] if currently a Map/Object
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

function getDocumentType(docId: string): "DNI" | "RUC" | "OTHER" {
  const cleanId = String(docId || "").trim();
  if (/^\d{8}$/.test(cleanId)) return "DNI";
  if (/^\d{11}$/.test(cleanId)) return "RUC";
  return "OTHER";
}

async function main() {
  console.log("🚀 Starting DRY-RUN migration for customers in yacco-2026...");
  
  const snap = await db.collection("customers").get();
  console.log(`🔍 Found ${snap.size} customers.`);

  let stats = {
    total: snap.size,
    dni: 0,
    ruc: 0,
    other: 0,
    mapToPricesArray: 0,
    locationsUpdated: 0
  };

  const examples: any[] = [];

  snap.forEach((doc) => {
    const data = doc.data();
    const docId = data.documentId || "";
    
    // 1. documentNumber & documentType
    const docType = getDocumentType(docId);
    if (docType === "DNI") stats.dni++;
    else if (docType === "RUC") stats.ruc++;
    else stats.other++;

    // 2. Locations mapping
    const originalLocations = data.locations || [];
    const newLocations = originalLocations.map((loc: any) => ({
      ...loc,
      isMain: loc.isDefault === true
    }));
    if (newLocations.length > 0) stats.locationsUpdated++;

    // 3. customPrices mapping
    let needsPriceConversion = false;
    if (data.customPrices && typeof data.customPrices === 'object' && !Array.isArray(data.customPrices)) {
      needsPriceConversion = true;
      stats.mapToPricesArray++;
    }

    // Capture examples
    if (examples.length < 3) {
      examples.push({
        id: doc.id,
        before: {
          documentId: data.documentId,
          type: data.type,
          customPrices: data.customPrices,
          locationsSample: originalLocations.slice(0, 1)
        },
        after: {
          documentNumber: docId,
          documentType: docType,
          customPrices: needsPriceConversion ? [] : data.customPrices,
          locationsSample: newLocations.slice(0, 1)
        }
      });
    }
  });

  console.log("\n📊 DRY-RUN RESULTS (SIMULATED):");
  console.log(`   - Total customers to process : ${stats.total}`);
  console.log(`   - New documentType counts    : DNI: ${stats.dni}, RUC: ${stats.ruc}, OTHER: ${stats.other}`);
  console.log(`   - customPrices conversion    : ${stats.mapToPricesArray} (Map -> [])`);
  console.log(`   - Customers with locations   : ${stats.locationsUpdated}`);

  console.log("\n🧪 EXAMPLES (BEFORE -> AFTER):");
  examples.forEach((ex, i) => {
    console.log(`\nExample ${i + 1} (${ex.id}):`);
    console.log("  BEFORE:", JSON.stringify(ex.before));
    console.log("  AFTER: ", JSON.stringify(ex.after));
  });

  console.log("\n⚠️  SIMULACIÓN. No se escribió nada en la base de datos.");
}

main().catch(console.error);
