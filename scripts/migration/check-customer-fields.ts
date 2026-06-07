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

      if (
        key === "FIRESTORE_EMULATOR_HOST" ||
        key === "FIREBASE_AUTH_EMULATOR_HOST" ||
        key === "FIREBASE_STORAGE_EMULATOR_HOST"
      ) {
        continue;
      }

      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

loadEnvLocal();

// Force disable emulators
delete process.env.FIRESTORE_EMULATOR_HOST;
delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
delete process.env.FIREBASE_STORAGE_EMULATOR_HOST;

if (!admin.apps.length) {
  const NEW_SA_PATH = process.env.NEW_SA_PATH;
  if (NEW_SA_PATH) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(fs.readFileSync(path.resolve(NEW_SA_PATH), "utf8")))
    });
  } else {
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

async function main() {
  const snap = await db.collection("customers").get();
  
  let hasDocumentId = 0;
  let hasDocumentNumber = 0;
  let hasBothDocs = 0;
  
  let hasType = 0;
  let hasDocumentType = 0;
  let hasBothTypes = 0;
  
  let locationsIsDefault = 0;
  let locationsIsMain = 0;
  
  let customPricesArray = 0;
  let customPricesRecord = 0;

  snap.forEach((doc) => {
    const data = doc.data();
    
    // Document check
    const docIdExists = data.documentId !== undefined;
    const docNumExists = data.documentNumber !== undefined;
    if (docIdExists) hasDocumentId++;
    if (docNumExists) hasDocumentNumber++;
    if (docIdExists && docNumExists) hasBothDocs++;
    
    // Type check
    const typeExists = data.type !== undefined;
    const docTypeExists = data.documentType !== undefined;
    if (typeExists) hasType++;
    if (docTypeExists) hasDocumentType++;
    if (typeExists && docTypeExists) hasBothTypes++;
    
    // Locations check
    const locations = data.locations || [];
    locations.forEach((loc: any) => {
      if (loc.isDefault !== undefined) locationsIsDefault++;
      if (loc.isMain !== undefined) locationsIsMain++;
    });
    
    // Custom prices check
    if (data.customPrices) {
      if (Array.isArray(data.customPrices)) {
        customPricesArray++;
      } else if (typeof data.customPrices === "object") {
        customPricesRecord++;
      }
    }
  });

  console.log(`📊 Customer fields analysis across ${snap.size} customers:`);
  console.log(`   ➔ Has documentId       : ${hasDocumentId}`);
  console.log("   ➔ Has documentNumber   : " + hasDocumentNumber);
  console.log(`   ➔ Has both doc fields  : ${hasBothDocs}`);
  console.log(`   ➔ Has type             : ${hasType}`);
  console.log(`   ➔ Has documentType     : ${hasDocumentType}`);
  console.log(`   ➔ Has both types       : ${hasBothTypes}`);
  console.log(`   ➔ locations[].isDefault: ${locationsIsDefault}`);
  console.log(`   ➔ locations[].isMain   : ${locationsIsMain}`);
  console.log(`   ➔ customPrices as Array: ${customPricesArray}`);
  console.log(`   ➔ customPrices as Map  : ${customPricesRecord}`);
}

main().catch(console.error);
