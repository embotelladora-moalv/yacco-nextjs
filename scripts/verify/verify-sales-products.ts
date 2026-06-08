import admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

/**
 * VERIFICATION SCRIPT: SALES & PRODUCTS
 * 
 * Target: Production (yacco-2026)
 * Strategy: Read-only. Scan and report structural status/anomalies.
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

// SAFETY GUARDRAILS
if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.error("❌ ABORT: FIRESTORE_EMULATOR_HOST is set. This script MUST run against PRODUCTION.");
  process.exit(1);
}

const projectId = process.env.FIREBASE_PROJECT_ID;
if (projectId !== "yacco-2026") {
  console.error(`❌ ABORT: Invalid Project ID: ${projectId}. Expected: yacco-2026`);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
    })
  });
}

const db = admin.firestore();
const reportPath = path.resolve(process.cwd(), "scripts/verify/report-sales-products.txt");

async function verifyProducts() {
  console.log("🔍 Scanning PRODUCTS...");
  const snap = await db.collection("products").get();
  
  const stats = {
    total: snap.size,
    hasOperationalCategory: 0,
    hasLegacyCategory: 0,
    hasPriceRefill: 0,
    hasPriceFull: 0,
    hasPriceEmpty: 0,
    hasLegacyBasePrice: 0,
    hasStockFilled: 0,
    hasStockEmpty: 0,
    hasVolumeCapacity: 0,
    hasUnitOfMeasure: 0,
    isActiveCount: 0,
  };

  const anomalies: Record<string, string[]> = {
    missingOperationalCategory: [],
    hasLegacyCategory: [],
    missingNewPrices: [],
    hasLegacyBasePrice: [],
  };

  snap.forEach(doc => {
    const data = doc.data();
    
    if (data.operationalCategory) stats.hasOperationalCategory++;
    else anomalies.missingOperationalCategory.push(doc.id);
    
    if (data.category) {
        stats.hasLegacyCategory++;
        anomalies.hasLegacyCategory.push(doc.id);
    }
    
    if (data.priceRefill !== undefined) stats.hasPriceRefill++;
    if (data.priceFull !== undefined) stats.hasPriceFull++;
    if (data.priceEmpty !== undefined) stats.hasPriceEmpty++;
    
    if (data.basePrice !== undefined) {
        stats.hasLegacyBasePrice++;
        anomalies.hasLegacyBasePrice.push(doc.id);
    }
    
    if (data.priceRefill === undefined && data.priceFull === undefined) {
        anomalies.missingNewPrices.push(doc.id);
    }

    if (data.stockFilled !== undefined) stats.hasStockFilled++;
    if (data.stockEmpty !== undefined) stats.hasStockEmpty++;
    if (data.volumeCapacity !== undefined) stats.hasVolumeCapacity++;
    if (data.unitOfMeasure !== undefined) stats.hasUnitOfMeasure++;
    if (data.isActive === true) stats.isActiveCount++;
  });

  return { stats, anomalies };
}

async function verifySales() {
  console.log("🔍 Scanning SALES (this may take a while)...");
  
  const stats = {
    total: 0,
    hasStatus: 0,
    hasPaymentStatus: 0,
    hasRemainingBalance: 0,
    hasLegacyDate: 0,
    hasLegacyDateProcess: 0,
    hasCreatedAtTimestamp: 0,
    hasUpdatedAtTimestamp: 0,
    itemsMissingItemSaleType: 0,
    itemsMissingBasicFields: 0,
    hasPaymentMethod: 0,
    hasCashReceived: 0,
    hasDigitalReceived: 0,
  };

  const anomalies: Record<string, string[]> = {
    missingStatus: [],
    missingPaymentStatus: [],
    missingRemainingBalance: [],
    hasLegacyDates: [],
    createdAtNotTimestamp: [],
    itemsIncomplete: [],
  };

  const BATCH_SIZE = 500;
  let lastDoc = null;
  let finished = false;

  while (!finished) {
    let query = db.collection("sales").orderBy("__name__").limit(BATCH_SIZE);
    if (lastDoc) {
        query = query.startAfter(lastDoc);
    }

    const snap = await query.get();
    if (snap.empty) {
        finished = true;
        break;
    }

    snap.forEach(doc => {
        stats.total++;
        const data = doc.data();

        // 1. Core fields
        if (data.status) stats.hasStatus++;
        else anomalies.missingStatus.push(doc.id);

        if (data.paymentStatus) stats.hasPaymentStatus++;
        else anomalies.missingPaymentStatus.push(doc.id);

        if (data.remainingBalance !== undefined) stats.hasRemainingBalance++;
        else anomalies.missingRemainingBalance.push(doc.id);

        // 2. Dates
        if (data.date) {
            stats.hasLegacyDate++;
            anomalies.hasLegacyDates.push(doc.id);
        }
        if (data.dateProcess) stats.hasLegacyDateProcess++;

        if (data.createdAt instanceof admin.firestore.Timestamp) stats.hasCreatedAtTimestamp++;
        else anomalies.createdAtNotTimestamp.push(doc.id);

        if (data.updatedAt instanceof admin.firestore.Timestamp) stats.hasUpdatedAtTimestamp++;

        // 3. Items
        const items = data.items || [];
        let itemAnomaly = false;
        let saleTypeMissing = false;
        
        items.forEach((item: any) => {
            if (!item.itemSaleType) saleTypeMissing = true;
            if (!item.productId || item.quantity === undefined || item.unitPrice === undefined) itemAnomaly = true;
        });

        if (saleTypeMissing) stats.itemsMissingItemSaleType++;
        if (itemAnomaly) {
            stats.itemsMissingBasicFields++;
            anomalies.itemsIncomplete.push(doc.id);
        }

        // 4. Payment
        if (data.paymentMethod) stats.hasPaymentMethod++;
        if (data.cashReceived !== undefined) stats.hasCashReceived++;
        if (data.digitalReceived !== undefined) stats.hasDigitalReceived++;
    });

    lastDoc = snap.docs[snap.docs.length - 1];
    process.stdout.write(`.`);
    if (snap.size < BATCH_SIZE) finished = true;
  }
  console.log("\nSales scan complete.");

  return { stats, anomalies };
}

async function main() {
  console.log(`🚀 Starting audit on Project: ${projectId}`);
  console.log("⚠️  READ-ONLY MODE ACTIVE. NO WRITES WILL BE PERFORMED.");

  const productReport = await verifyProducts();
  const salesReport = await verifySales();

  let output = `PRODUCTION DATA AUDIT REPORT - ${new Date().toISOString()}\n`;
  output += `Project ID: ${projectId}\n`;
  output += `========================================================\n\n`;

  output += `1. PRODUCTS COLLECTION\n`;
  output += `--------------------------------------------------------\n`;
  output += `Total documents: ${productReport.stats.total}\n`;
  output += `Fields availability:\n`;
  output += `  - operationalCategory : ${productReport.stats.hasOperationalCategory}\n`;
  output += `  - category (legacy)    : ${productReport.stats.hasLegacyCategory}\n`;
  output += `  - priceRefill         : ${productReport.stats.hasPriceRefill}\n`;
  output += `  - priceFull           : ${productReport.stats.hasPriceFull}\n`;
  output += `  - priceEmpty          : ${productReport.stats.hasPriceEmpty}\n`;
  output += `  - basePrice (legacy)   : ${productReport.stats.hasLegacyBasePrice}\n`;
  output += `  - stockFilled         : ${productReport.stats.hasStockFilled}\n`;
  output += `  - stockEmpty          : ${productReport.stats.hasStockEmpty}\n`;
  output += `  - volumeCapacity      : ${productReport.stats.hasVolumeCapacity}\n`;
  output += `  - unitOfMeasure       : ${productReport.stats.hasUnitOfMeasure}\n`;
  output += `  - isActive (true)     : ${productReport.stats.isActiveCount}\n\n`;

  output += `Anomalies (Example IDs, max 20):\n`;
  for (const [key, ids] of Object.entries(productReport.anomalies)) {
      output += `  - ${key}: ${ids.slice(0, 20).join(", ")}\n`;
  }

  output += `\n2. SALES COLLECTION\n`;
  output += `--------------------------------------------------------\n`;
  output += `Total documents scanned: ${salesReport.stats.total}\n`;
  output += `Structural availability:\n`;
  output += `  - status              : ${salesReport.stats.hasStatus}\n`;
  output += `  - paymentStatus       : ${salesReport.stats.hasPaymentStatus}\n`;
  output += `  - remainingBalance    : ${salesReport.stats.hasRemainingBalance}\n`;
  output += `  - date (legacy)       : ${salesReport.stats.hasLegacyDate}\n`;
  output += `  - dateProcess (legacy): ${salesReport.stats.hasLegacyDateProcess}\n`;
  output += `  - createdAt Timestamp : ${salesReport.stats.hasCreatedAtTimestamp}\n`;
  output += `  - updatedAt Timestamp : ${salesReport.stats.hasUpdatedAtTimestamp}\n`;
  output += `  - items missing type  : ${salesReport.stats.itemsMissingItemSaleType}\n`;
  output += `  - items incomplete    : ${salesReport.stats.itemsMissingBasicFields}\n`;
  output += `  - paymentMethod       : ${salesReport.stats.hasPaymentMethod}\n`;
  output += `  - cashReceived        : ${salesReport.stats.hasCashReceived}\n`;
  output += `  - digitalReceived     : ${salesReport.stats.hasDigitalReceived}\n\n`;

  output += `Anomalies (Example IDs, max 20):\n`;
  for (const [key, ids] of Object.entries(salesReport.anomalies)) {
      output += `  - ${key}: ${ids.slice(0, 20).join(", ")}\n`;
  }

  fs.writeFileSync(reportPath, output);
  console.log(`\n✅ REPORT SAVED TO: ${reportPath}`);
}

main().catch(console.error);
