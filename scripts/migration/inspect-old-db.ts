// scripts/migration/inspect-old-db.ts
import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

const HOME = process.env.HOME || process.env.USERPROFILE || "";
const OLD_SERVICE_ACCOUNT_PATH =
  process.env.OLD_SA_PATH ||
  path.resolve(HOME, "Desktop/claude-staging/keys/old-service-account.json");

if (!fs.existsSync(OLD_SERVICE_ACCOUNT_PATH)) {
  console.error(`❌ Error: No se encontró el service account en: ${OLD_SERVICE_ACCOUNT_PATH}`);
  console.error(`   Podés setear la ruta con: OLD_SA_PATH=/tu/ruta/service-account.json`);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(OLD_SERVICE_ACCOUNT_PATH, "utf8"));

const oldApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
}, "old-project");

const db = oldApp.firestore();

async function inspect() {
  console.log(`🚀 Iniciando inspección del proyecto viejo: ${serviceAccount.project_id}\n`);

  const collections = await db.listCollections();
  const schemaSample: Record<string, any> = {};

  for (const col of collections) {
    console.log(`📦 Colección detectada: ${col.id}`);

    const snapshot = await col.limit(3).get();
    const docs: any[] = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      docs.push({
        id: doc.id,
        data: anonymize(data),
        _rawTypes: getFieldTypes(data),
      });
    });

    if (docs.length > 0) {
      schemaSample[col.id] = docs;
      console.log(`   └─ Campos encontrados: ${Object.keys(docs[0]?.data || {}).join(", ")}\n`);
    } else {
      console.log(`   └─ (Colección vacía)\n`);
    }
  }

  const outputPath = path.join(__dirname, "old-schema-sample.json");
  fs.writeFileSync(outputPath, JSON.stringify(schemaSample, null, 2));

  console.log(`✅ Inspección finalizada.`);
  console.log(`📁 Muestra anonimizada guardada en: ${outputPath}`);
}

function anonymize(obj: any): any {
  const piiFields = [
    "name", "fullName", "fullname", "lastName", "phone", "telephone",
    "email", "documentId", "documentNumber", "address", "reference",
  ];
  const newObj = { ...obj };

  for (const key in newObj) {
    if (piiFields.includes(key)) {
      newObj[key] = "***";
    } else if (
      typeof newObj[key] === "object" &&
      newObj[key] !== null &&
      !(newObj[key] instanceof admin.firestore.Timestamp)
    ) {
      newObj[key] = anonymize(newObj[key]);
    }
  }
  return newObj;
}

function getFieldTypes(obj: any, depth = 0): any {
  const types: any = {};
  for (const key in obj) {
    const val = obj[key];
    if (val === null) {
      types[key] = "null";
    } else if (val instanceof admin.firestore.Timestamp) {
      types[key] = "Timestamp";
    } else if (val instanceof admin.firestore.GeoPoint) {
      types[key] = "GeoPoint";
    } else if (Array.isArray(val)) {
      if (val.length === 0) {
        types[key] = "Array<empty>";
      } else if (typeof val[0] === "object" && val[0] !== null && depth < 3) {
        types[key] = { "Array[]": getFieldTypes(val[0], depth + 1) };
      } else {
        types[key] = `Array<${typeof val[0]}>`;
      }
    } else if (typeof val === "object" && depth < 3) {
      types[key] = getFieldTypes(val, depth + 1);
    } else {
      types[key] = typeof val;
    }
  }
  return types;
}

inspect().catch(console.error);
