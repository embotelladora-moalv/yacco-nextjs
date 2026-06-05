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

interface ContainerBalanceItem {
  productId: string;
  balance: number;
}

interface ResetExample {
  docId: string;
  customerName: string;
  beforeBalances: ContainerBalanceItem[];
  beforeLoaned: Record<string, number>;
  afterBalances: [];
  afterLoaned: Record<string, never>;
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
  console.log("🏺 CUSTOMER CONTAINER BALANCES RESET");
  console.log(`Mode: ${isCommit ? "🚨 COMMIT (Writing to DB)" : "🔍 DRY-RUN (Read-Only)"}`);
  console.log("=========================================\n");

  console.log("🔍 Fetching all customers...");
  const snapshot = await db.collection("customers").get();
  console.log(`   Found ${snapshot.size} total customers.`);

  if (snapshot.empty) {
    console.log("🎉 No customers found. Exiting.");
    process.exit(0);
  }

  const examples: ResetExample[] = [];
  const updateTargets: Array<{
    docRef: admin.firestore.DocumentReference;
    customerId: string;
    oldBalances: ContainerBalanceItem[];
    oldLoaned: Record<string, number>;
  }> = [];

  let skipCount = 0;
  let updateCount = 0;
  let totalForgivenBottles = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const docId = doc.id;
    const customerName = data.name || "Unknown";
    const balances = (data.containerBalances || []) as ContainerBalanceItem[];
    const loanedItems = (data.loanedItems || {}) as Record<string, number>;

    // A customer needs update if they have items in containerBalances OR active values in loanedItems
    const hasActiveBalances = balances.length > 0;
    const hasActiveLoaned = Object.keys(loanedItems).some(k => loanedItems[k] !== 0);

    if (hasActiveBalances || hasActiveLoaned) {
      updateCount++;
      updateTargets.push({
        docRef: doc.ref,
        customerId: docId,
        oldBalances: balances,
        oldLoaned: loanedItems
      });

      // Sum active positive balances from both containerBalances and loanedItems.
      // Since they are dual representations of container debts, we take the maximum to avoid double-counting.
      const documentSumCB = balances.reduce((sum, item) => sum + (item.balance > 0 ? item.balance : 0), 0);
      const documentSumLI = Object.entries(loanedItems).reduce((sum, [_, qty]) => sum + (qty > 0 ? qty : 0), 0);
      const documentSum = Math.max(documentSumCB, documentSumLI);
      totalForgivenBottles += documentSum;

      if (examples.length < 15) {
        examples.push({
          docId,
          customerName,
          beforeBalances: balances,
          beforeLoaned: loanedItems,
          afterBalances: [],
          afterLoaned: {}
        });
      }
    } else {
      skipCount++;
    }
  }

  console.log("\n📊 Analysis Results:");
  console.log(`   ➔ Total customers analyzed: ${snapshot.size}`);
  console.log(`   ➔ Already at zero balance (skipped): ${skipCount}`);
  console.log(`   ➔ Requiring balance reset: ${updateCount}`);
  console.log(`   ➔ Total units (bottles) to be forgiven: ${totalForgivenBottles} units (approx/max)`);

  if (updateCount === 0) {
    console.log("\n🎉 All customer container balances are already at zero. No changes needed.");
    process.exit(0);
  }

  // Display examples
  console.log("\n📝 Reset Examples (anonymized):");
  console.log(
    "| " +
    "Doc ID".padEnd(22) + " | " +
    "Customer".padEnd(25) + " | " +
    "Before (Balances & Loaned)".padEnd(35) + " | " +
    "After".padEnd(10) + " |"
  );
  console.log(
    "|-" + "-".repeat(22) + "-|-" + "-".repeat(25) + "-|-" + "-".repeat(35) + "-|-" + "-".repeat(10) + "-|"
  );

  examples.slice(0, 10).forEach(ex => {
    const beforeCBStr = ex.beforeBalances.map(b => `${b.productId.slice(0,6)}..:${b.balance}`).join(", ");
    const beforeLIStr = Object.entries(ex.beforeLoaned)
      .map(([pid, qty]) => `${pid.slice(0,6)}..:${qty}`)
      .join(", ");
    const beforeStr = `CB:[${beforeCBStr}] | LI:{${beforeLIStr}}`;
    console.log(
      "| " +
      ex.docId.padEnd(22) + " | " +
      anonymizeName(ex.customerName).padEnd(25) + " | " +
      beforeStr.slice(0, 35).padEnd(35) + " | " +
      "[] & {}".padEnd(10) + " |"
    );
  });
  console.log("---------------------------------------------------------------------------------------------\n");

  if (!isCommit) {
    console.log("💡 Dry-run finished. No data was written to the database.");
    console.log("💡 Run with '--commit' to execute the container balance reset on Firestore.\n");
    process.exit(0);
  }

  // Execute Commit
  // Create safety backup
  console.log("💾 Creating safety backup of container balances...");
  const backupData = updateTargets.map(target => ({
    customerId: target.customerId,
    timestamp: new Date().toISOString(),
    containerBalances: target.oldBalances,
    loanedItems: target.oldLoaned
  }));
  
  const cleanupDir = path.resolve(process.cwd(), "scripts/cleanup");
  if (!fs.existsSync(cleanupDir)) {
    fs.mkdirSync(cleanupDir, { recursive: true });
  }
  const backupPath = path.join(cleanupDir, "container-balances-backup.json");
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), "utf8");
  console.log(`💾 Safety backup written to: ${backupPath}\n`);

  console.log("🚨 Resetting container balances in Firestore batches...");
  let batch = db.batch();
  let batchSize = 0;
  let commitCount = 0;

  for (const target of updateTargets) {
    batch.update(target.docRef, {
      containerBalances: [],
      loanedItems: {},
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

  console.log(`\n✅ Container balances reset completed successfully.`);
  console.log(`   ➔ Total updated documents: ${commitCount}`);
  console.log(`   ➔ Total forgiven units: ${totalForgivenBottles} units\n`);
}

run().catch((err) => {
  console.error("❌ Reset script failed:", err);
  process.exit(1);
});
