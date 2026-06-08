import admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

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

function initAdmin() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
      })
    });
  }
}

loadEnvLocal();
initAdmin();

const db = admin.firestore();

async function run() {
  console.log("Fetching samples...");
  
  const oldSnap = await db.collection("sales").orderBy("createdAt", "asc").limit(3).get();
  const newSnap = await db.collection("sales").orderBy("createdAt", "desc").limit(1).get();

  const oldest = oldSnap.docs.map(d => ({ id: d.id, data: d.data() }));
  const newest = newSnap.docs.map(d => ({ id: d.id, data: d.data() }));

  console.log("\n--- OLDEST 3 ---");
  oldest.forEach((doc, i) => {
    console.log(`Doc ${i+1} ID: ${doc.id}`);
    console.log(JSON.stringify(doc.data, null, 2));
  });

  console.log("\n--- NEWEST 1 ---");
  newest.forEach((doc, i) => {
    console.log(`Doc ID: ${doc.id}`);
    console.log(JSON.stringify(doc.data, null, 2));
  });

  // Brief check on field consistency across 100 docs
  const consistencySnap = await db.collection("sales").limit(100).get();
  let hasTotalAmount = 0;
  let totalAmountType = "";
  let hasCreatedAt = 0;
  let createdAtType = "";
  let hasDate = 0;
  let dateType = "";
  let statuses = new Set<string>();

  consistencySnap.forEach(doc => {
    const data = doc.data();
    if (data.totalAmount !== undefined) {
      hasTotalAmount++;
      totalAmountType = typeof data.totalAmount;
    }
    if (data.createdAt !== undefined) {
      hasCreatedAt++;
      createdAtType = data.createdAt.constructor.name;
    }
    if (data.date !== undefined) {
      hasDate++;
      dateType = typeof data.date;
    }
    if (data.status) statuses.add(data.status);
  });

  console.log("\n--- CONSISTENCY (Samples 100) ---");
  console.log(`Total docs with totalAmount: ${hasTotalAmount} (Type: ${totalAmountType})`);
  console.log(`Total docs with createdAt: ${hasCreatedAt} (Type: ${createdAtType})`);
  console.log(`Total docs with date: ${hasDate} (Type: ${dateType})`);
  console.log(`Found statuses: ${Array.from(statuses).join(", ")}`);
}

run().catch(console.error);
