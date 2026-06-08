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

async function getSamples() {
  console.log("Fetching oldest 3...");
  const oldSnap = await db.collection("sales").orderBy("createdAt", "asc").limit(3).get();
  
  console.log("Fetching newest 2...");
  const newSnap = await db.collection("sales").orderBy("createdAt", "desc").limit(2).get();

  const oldest = oldSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const newest = newSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  console.log("\n--- OLDEST 3 ---");
  console.log(JSON.stringify(oldest, null, 2));

  console.log("\n--- NEWEST 2 ---");
  console.log(JSON.stringify(newest, null, 2));
}

getSamples().catch(console.error);
