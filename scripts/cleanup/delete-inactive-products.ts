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

interface ProductHistoryRef {
  sales: number;
  orders: number;
  kardex: number;
  dispatch: number;
  customer: number;
  production: number;
  shrinkage: number;
}

interface CleanupPlanItem {
  sku: string;
  productId: string;
  name: string;
  isActive: boolean;
  history: ProductHistoryRef;
  totalRefs: number;
  action: "DELETE";
  hasHistoryWarning: boolean;
}

async function run() {
  const args = process.argv.slice(2);
  const isCommit = args.includes("--commit");

  console.log("=========================================");
  console.log("🧹 INACTIVE PRODUCTS CLEANUP (FORCE-DELETE)");
  console.log(`Mode: ${isCommit ? "🚨 COMMIT (DELETING FROM DB)" : "🔍 DRY-RUN (Read-Only)"}`);
  console.log("=========================================\n");

  // 1. Fetch inactive products
  console.log("🔍 Fetching inactive products...");
  const productsSnap = await db.collection("products").where("isActive", "==", false).get();
  console.log(`   Found ${productsSnap.size} inactive products.`);

  if (productsSnap.empty) {
    console.log("🎉 No inactive products found in the catalog. Nothing to do.");
    process.exit(0);
  }

  // Map to hold references for each inactive product ID
  const historyMap = new Map<string, ProductHistoryRef>();
  const productMap = new Map<string, admin.firestore.DocumentData>();

  productsSnap.docs.forEach(doc => {
    const data = doc.data();
    productMap.set(doc.id, data);
    historyMap.set(doc.id, {
      sales: 0,
      orders: 0,
      kardex: 0,
      dispatch: 0,
      customer: 0,
      production: 0,
      shrinkage: 0
    });
  });

  // 2. Fetch history collections once (Optimized O(1) fetch profile)
  console.log("📊 Scanning database references for history checks...");

  const [
    salesSnap,
    ordersSnap,
    dispatchSnap,
    customersSnap,
    kardexSnap,
    productionSnap,
    shrinkageSnap
  ] = await Promise.all([
    db.collection("sales").select("items", "returnedEmpties").get(),
    db.collection("orders").select("items").get(),
    db.collection("dispatchManifests").select("items", "returnedEmpties").get(),
    db.collection("customers").select("containerBalances", "loanedItems", "customPrices").get(),
    db.collection("kardexLogs").select("productId").get(),
    db.collection("productionBatches").select("productId").get(),
    db.collection("shrinkageLogs").select("productId").get()
  ]);

  // 3. Scan references in memory
  // A. Sales
  salesSnap.docs.forEach(doc => {
    const data = doc.data();
    const items = data.items || [];
    const returned = data.returnedEmpties || [];
    
    items.forEach((it: { productId?: string }) => {
      if (it?.productId && historyMap.has(it.productId)) {
        historyMap.get(it.productId)!.sales++;
      }
    });
    returned.forEach((ret: { productId?: string }) => {
      if (ret?.productId && historyMap.has(ret.productId)) {
        historyMap.get(ret.productId)!.sales++;
      }
    });
  });

  // B. Orders
  ordersSnap.docs.forEach(doc => {
    const data = doc.data();
    const items = data.items || [];
    items.forEach((it: { productId?: string }) => {
      if (it?.productId && historyMap.has(it.productId)) {
        historyMap.get(it.productId)!.orders++;
      }
    });
  });

  // C. Dispatch Manifests
  dispatchSnap.docs.forEach(doc => {
    const data = doc.data();
    const items = data.items || [];
    const returned = data.returnedEmpties || [];
    
    items.forEach((it: { productId?: string }) => {
      if (it?.productId && historyMap.has(it.productId)) {
        historyMap.get(it.productId)!.dispatch++;
      }
    });
    returned.forEach((ret: { productId?: string }) => {
      if (ret?.productId && historyMap.has(ret.productId)) {
        historyMap.get(ret.productId)!.dispatch++;
      }
    });
  });

  // D. Customers
  customersSnap.docs.forEach(doc => {
    const data = doc.data();
    const balances = data.containerBalances || [];
    const loaned = data.loanedItems || {};
    const prices = data.customPrices || {};

    balances.forEach((bal: { productId?: string }) => {
      if (bal?.productId && historyMap.has(bal.productId)) {
        historyMap.get(bal.productId)!.customer++;
      }
    });
    Object.keys(loaned).forEach(pId => {
      if (historyMap.has(pId) && loaned[pId] !== 0) {
        historyMap.get(pId)!.customer++;
      }
    });
    Object.keys(prices).forEach(pId => {
      if (historyMap.has(pId)) {
        historyMap.get(pId)!.customer++;
      }
    });
  });

  // E. Kardex Logs
  kardexSnap.docs.forEach(doc => {
    const pId = doc.data().productId;
    if (pId && historyMap.has(pId)) {
      historyMap.get(pId)!.kardex++;
    }
  });

  // F. Production Batches
  productionSnap.docs.forEach(doc => {
    const pId = doc.data().productId;
    if (pId && historyMap.has(pId)) {
      historyMap.get(pId)!.production++;
    }
  });

  // G. Shrinkage Logs
  shrinkageSnap.docs.forEach(doc => {
    const pId = doc.data().productId;
    if (pId && historyMap.has(pId)) {
      historyMap.get(pId)!.shrinkage++;
    }
  });

  // 4. Compile plan (ALL inactive products are DELETE candidates)
  const plan: CleanupPlanItem[] = [];
  let totalOrphanedRefs = 0;

  historyMap.forEach((history, productId) => {
    const prod = productMap.get(productId)!;
    const totalRefs =
      history.sales +
      history.orders +
      history.kardex +
      history.dispatch +
      history.customer +
      history.production +
      history.shrinkage;

    totalOrphanedRefs += totalRefs;

    plan.push({
      sku: prod.sku || "N/A",
      productId,
      name: prod.name || "Unknown",
      isActive: prod.isActive,
      history,
      totalRefs,
      action: "DELETE",
      hasHistoryWarning: totalRefs > 0
    });
  });

  // Save the cleanup plan
  const cleanupDir = path.resolve(process.cwd(), "scripts/cleanup");
  if (!fs.existsSync(cleanupDir)) {
    fs.mkdirSync(cleanupDir, { recursive: true });
  }
  const planPath = path.join(cleanupDir, "delete-plan.json");
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2), "utf8");
  console.log(`💾 Cleanup plan saved to: ${planPath}`);

  // Print ASCII Table
  console.log("\n--- INACTIVE PRODUCTS AUDIT REPORT ---");
  console.log(
    "| " +
    "SKU".padEnd(10) + " | " +
    "Product ID".padEnd(22) + " | " +
    "Name".padEnd(25) + " | " +
    "Refs Hist.".padEnd(10) + " | " +
    "Action".padEnd(22) + " |"
  );
  console.log(
    "|-" + "-".repeat(10) + "-|-" + "-".repeat(22) + "-|-" + "-".repeat(25) + "-|-" + "-".repeat(10) + "-|-" + "-".repeat(22) + "-|"
  );

  plan.forEach(item => {
    const warningText = item.hasHistoryWarning ? `⚠️ ${item.totalRefs} refs` : "0 (Clean)";
    const actionText = item.hasHistoryWarning ? "DELETE (Orphans!)" : "DELETE";
    console.log(
      "| " +
      item.sku.padEnd(10) + " | " +
      item.productId.padEnd(22) + " | " +
      item.name.slice(0, 25).padEnd(25) + " | " +
      warningText.padEnd(10) + " | " +
      actionText.padEnd(22) + " |"
    );
  });
  console.log("---------------------------------------\n");

  console.log(`Summary:`);
  console.log(`  - Total inactive products targeted for deletion: ${plan.length}`);
  console.log(`  - Total transactional references that will be orphaned: ${totalOrphanedRefs}\n`);

  if (!isCommit) {
    console.log("💡 Dry-run finished. No data was deleted from the database.");
    console.log("💡 Review the candidate list and warning counts.");
    console.log("💡 Run with '--commit' to execute force deletion.\n");
    process.exit(0);
  }

  // 5. Execution Phase (Commit)
  // Create safety backup
  console.log("💾 Creating safety backup of products to be deleted...");
  const backupData = plan.map(item => ({
    productId: item.productId,
    timestamp: new Date().toISOString(),
    data: productMap.get(item.productId),
    orphanedRefsCount: item.totalRefs
  }));
  const backupPath = path.join(cleanupDir, "deleted-products-backup.json");
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), "utf8");
  console.log(`💾 Safety backup written to: ${backupPath}\n`);

  console.log("🚨 Proceeding to delete all inactive products from database...");
  let deletedCount = 0;

  const batch = db.batch();

  for (const candidate of plan) {
    const pId = candidate.productId;
    const prodRef = db.collection("products").doc(pId);
    batch.delete(prodRef);
    deletedCount++;
    if (candidate.hasHistoryWarning) {
      console.log(`   ➔ Staged for deletion: ${candidate.name} (${pId}) - ⚠️ leaving ${candidate.totalRefs} orphaned references.`);
    } else {
      console.log(`   ➔ Staged for deletion: ${candidate.name} (${pId}) - clean.`);
    }
  }

  if (deletedCount > 0) {
    console.log(`\n📦 Committing batch of ${deletedCount} deletions to Firestore...`);
    await batch.commit();
    console.log("✅ Force-deletion completed successfully.");
  } else {
    console.log("\nℹ️ No deletions were executed.");
  }

  console.log(`\nFinal Results:`);
  console.log(`  - Deleted: ${deletedCount}`);
  console.log(`  - Total references left orphaned: ${totalOrphanedRefs}\n`);
}

run().catch((err) => {
  console.error("❌ Cleanup process failed:", err);
  process.exit(1);
});
