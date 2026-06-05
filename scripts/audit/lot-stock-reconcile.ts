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
      console.error("Please set NEW_SA_PATH or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env.local.");
      process.exit(1);
    }
    console.log(`🔑 Authenticating using environment variables for project: ${projectId}`);
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  }
}

const db = admin.firestore();

interface BatchInfo {
  id: string;
  lotNumber: string;
  currentStock: number;
  expirationDate: string | null;
}

interface ProductReconciliation {
  productId: string;
  sku: string;
  name: string;
  operationalCategory: string;
  stockFilled: number;
  batchesSum: number;
  difference: number;
  status: "OK" | "DESCUADRE";
  batches: BatchInfo[];
}

function formatDate(val: any): string | null {
  if (!val) return null;
  if (val instanceof admin.firestore.Timestamp) {
    return val.toDate().toISOString().split("T")[0];
  }
  if (val instanceof Date) {
    return val.toISOString().split("T")[0];
  }
  if (typeof val === "string") {
    return val.split("T")[0];
  }
  return String(val);
}

async function run() {
  console.log("=========================================================");
  console.log("🔍 LOT STOCK RECONCILIATION AUDIT (READ-ONLY)");
  console.log("=========================================================\n");

  // Fetch active products
  console.log("📥 Fetching active products...");
  const productsSnap = await db
    .collection("products")
    .where("isActive", "==", true)
    .get();
  console.log(`   Found ${productsSnap.size} active products.`);

  // Fetch all production batches
  console.log("📥 Fetching all production batches...");
  const batchesSnap = await db.collection("productionBatches").get();
  console.log(`   Found ${batchesSnap.size} total production batches.`);

  // Group batches by productId
  const batchesByProduct: Record<string, BatchInfo[]> = {};
  batchesSnap.docs.forEach((doc) => {
    const data = doc.data();
    const pId = data.productId;
    if (pId) {
      if (!batchesByProduct[pId]) {
        batchesByProduct[pId] = [];
      }
      batchesByProduct[pId].push({
        id: doc.id,
        lotNumber: data.lotNumber || "SIN-LOTE",
        currentStock: Number(data.currentStock) || 0,
        expirationDate: formatDate(data.expirationDate),
      });
    }
  });

  const reconciliationList: ProductReconciliation[] = [];
  let totalDiscrepancies = 0;
  let totalDiscrepancyMagnitude = 0;

  productsSnap.docs.forEach((doc) => {
    const pData = doc.data();
    const pId = doc.id;
    
    // We reconcile stockFilled (filled stock). Empty containers and accessories don't typically have production batches.
    // However, let's process them if they are active, or focus primarily on products that can have batches.
    const operationalCategory = pData.operationalCategory || "UNKNOWN";
    
    const stockFilled = Number(pData.stockFilled) || 0;
    const productBatches = batchesByProduct[pId] || [];
    const batchesSum = productBatches.reduce((acc, b) => acc + b.currentStock, 0);
    const difference = stockFilled - batchesSum;
    const status = difference === 0 ? "OK" : "DESCUADRE";

    if (status === "DESCUADRE") {
      totalDiscrepancies++;
      totalDiscrepancyMagnitude += Math.abs(difference);
    }

    reconciliationList.push({
      productId: pId,
      sku: pData.sku || "N/A",
      name: pData.name || "Unnamed",
      operationalCategory,
      stockFilled,
      batchesSum,
      difference,
      status,
      batches: productBatches,
    });
  });

  // Sort: show discrepancies first, then order by SKU
  reconciliationList.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "DESCUADRE" ? -1 : 1;
    }
    return a.sku.localeCompare(b.sku);
  });

  // Display Table
  console.log("\n=============================================================================================");
  console.log(
    "| " +
    "SKU".padEnd(12) + " | " +
    "STOCK FILLED".padStart(13) + " | " +
    "SUM BATCHES".padStart(13) + " | " +
    "DIFFERENCE".padStart(12) + " | " +
    "STATUS".padEnd(12) + " | " +
    "PRODUCT NAME".padEnd(25) + " |"
  );
  console.log(
    "|-" + "-".repeat(12) + "-|-" + "-".repeat(13) + "-|-" + "-".repeat(13) + "-|-" + "-".repeat(12) + "-|-" + "-".repeat(12) + "-|-" + "-".repeat(25) + "-|"
  );

  reconciliationList.forEach((r) => {
    const diffStr = r.difference > 0 ? `+${r.difference}` : String(r.difference);
    const statusStr = r.status === "DESCUADRE" ? "⚠️ DESCUADRE" : "✅ OK";
    console.log(
      "| " +
      r.sku.padEnd(12) + " | " +
      String(r.stockFilled).padStart(13) + " | " +
      String(r.batchesSum).padStart(13) + " | " +
      diffStr.padStart(12) + " | " +
      statusStr.padEnd(12) + " | " +
      r.name.substring(0, 25).padEnd(25) + " |"
    );
  });
  console.log("=============================================================================================\n");

  // Summary
  console.log("=========================================================");
  console.log("📊 AUDIT SUMMARY");
  console.log("=========================================================");
  console.log(`Total Products Checked: ${reconciliationList.length}`);
  console.log(`Perfect Matches (OK)  : ${reconciliationList.length - totalDiscrepancies}`);
  console.log(`Discrepancies Found   : ${totalDiscrepancies}`);
  console.log(`Total Abs Discrepancy : ${totalDiscrepancyMagnitude} units`);
  console.log("=========================================================\n");

  // Get 5 Examples with Batch Details (prioritize those with discrepancies)
  const examples = reconciliationList
    .filter((r) => r.operationalCategory === "FULL_PRODUCT" || r.batches.length > 0)
    .slice(0, 5);

  console.log("📝 5 BATCH DETAILS EXAMPLES:");
  console.log("=========================================================");
  examples.forEach((ex, idx) => {
    console.log(`\nExample ${idx + 1}: ${ex.name} (SKU: ${ex.sku})`);
    console.log(`- Product ID  : ${ex.productId}`);
    console.log(`- Category    : ${ex.operationalCategory}`);
    console.log(`- StockFilled : ${ex.stockFilled}`);
    console.log(`- Batches Sum : ${ex.batchesSum}`);
    console.log(`- Difference  : ${ex.difference > 0 ? `+${ex.difference}` : ex.difference} (${ex.status})`);
    console.log(`- Production Batches (${ex.batches.length}):`);
    if (ex.batches.length === 0) {
      console.log("  (No production batches found for this product)");
    } else {
      console.log("  " + "LOT NUMBER".padEnd(15) + " | " + "CURRENT STOCK".padStart(13) + " | " + "EXPIRATION DATE".padEnd(15));
      console.log("  " + "-".repeat(15) + "-+-" + "-".repeat(13) + "-+-" + "-".repeat(15));
      ex.batches.forEach((b) => {
        console.log(`  ${b.lotNumber.padEnd(15)} | ${String(b.currentStock).padStart(13)} | ${(b.expirationDate || "N/A").padEnd(15)}`);
      });
    }
  });
  console.log("\n=========================================================");

  // Write report to JSON file
  const auditDir = path.resolve(process.cwd(), "scripts/audit");
  if (!fs.existsSync(auditDir)) {
    fs.mkdirSync(auditDir, { recursive: true });
  }
  const reportPath = path.join(auditDir, "lot-reconcile-report.json");
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        summary: {
          totalChecked: reconciliationList.length,
          totalOk: reconciliationList.length - totalDiscrepancies,
          totalDiscrepancies,
          totalDiscrepancyMagnitude,
        },
        reconciliation: reconciliationList,
      },
      null,
      2
    ),
    "utf8"
  );
  console.log(`\n💾 Detailed JSON report written to: ${reportPath}\n`);

  process.exit(0);
}

run().catch((e) => {
  console.error("❌ Reconciliation audit failed:", e);
  process.exit(1);
});
