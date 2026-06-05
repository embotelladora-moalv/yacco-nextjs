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
      
      // Remove enclosing quotes if present (both single and double quotes)
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

// Load env vars
loadEnvLocal();

// Determine connection settings (supporting NEW_SA_PATH or individual keys)
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
      console.error("Please ensure that either NEW_SA_PATH or individual environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) are set in .env.local.");
      process.exit(1);
    }
    console.log(`🔑 Authenticating using individual environment variables for project: ${projectId}`);
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  }
}

const db = admin.firestore();

function toCamelCase(str: string): string {
  return str
    .replace(/([-_][a-z0-9])/gi, ($1) => {
      return $1.toUpperCase().replace('-', '').replace('_', '');
    })
    .replace(/^[A-Z]/, (firstLetter) => firstLetter.toLowerCase());
}

function classifyCollectionName(name: string) {
  const isCamelCase = /^[a-z][a-zA-Z0-9]*$/.test(name);
  const isSnakeCase = /^[a-z0-9]+(_[a-z0-9]+)+$/.test(name);
  const isKebabCase = /^[a-z0-9]+(-[a-z0-9]+)+$/.test(name);
  const isPascalCase = /^[A-Z][a-zA-Z0-9]*$/.test(name);

  let convention = "other";
  if (isCamelCase) {
    convention = "camelCase";
  } else if (isSnakeCase) {
    convention = "snake_case";
  } else if (isKebabCase) {
    convention = "kebab-case";
  } else if (isPascalCase) {
    convention = "PascalCase";
  }

  const needsRename = !isCamelCase;
  const proposedName = needsRename ? toCamelCase(name) : name;

  return {
    convention,
    needsRename,
    proposedName
  };
}

async function detectSubcollections(collectionRef: admin.firestore.CollectionReference): Promise<string[]> {
  const sampleDocs = await collectionRef.limit(5).get();
  const subcollectionNames = new Set<string>();
  for (const doc of sampleDocs.docs) {
    try {
      const subcols = await doc.ref.listCollections();
      for (const subcol of subcols) {
        subcollectionNames.add(subcol.id);
      }
    } catch (e) {
      // Ignore errors on specific documents if they happen
    }
  }
  return Array.from(subcollectionNames);
}

interface CollectionAuditResult {
  collection: string;
  docCount: number;
  currentConvention: string;
  needsRename: boolean;
  proposedCamelCaseName: string;
  subcollections: string[];
}

async function run() {
  console.log("🔍 Fetching root collections from Firestore...");
  const collections = await db.listCollections();
  
  console.log(`📦 Found ${collections.length} root collections.`);
  const results: CollectionAuditResult[] = [];

  for (const col of collections) {
    const colName = col.id;
    console.log(`Checking collection: ${colName}...`);
    
    // 1. Count documents server-side (aggregation query)
    const countSnapshot = await col.count().get();
    const docCount = countSnapshot.data().count;
    
    // 2. Classify name
    const classification = classifyCollectionName(colName);
    
    // 3. Detect subcollections (sample of 5)
    const subcollections = await detectSubcollections(col);
    
    results.push({
      collection: colName,
      docCount,
      currentConvention: classification.convention,
      needsRename: classification.needsRename,
      proposedCamelCaseName: classification.proposedName,
      subcollections
    });
  }

  // Generate ASCII table for console output
  console.log("\n--- COLLECTION AUDIT REPORT ---");
  console.log(
    "| " +
    "Colección".padEnd(25) + " | " +
    "# Docs".padEnd(8) + " | " +
    "Convención".padEnd(12) + " | " +
    "¿Rename?".padEnd(8) + " | " +
    "Propuesto".padEnd(25) + " | " +
    "Subcolecciones".padEnd(25) + " |"
  );
  console.log(
    "|-" + "-".repeat(25) + "-|-" + "-".repeat(8) + "-|-" + "-".repeat(12) + "-|-" + "-".repeat(8) + "-|-" + "-".repeat(25) + "-|-" + "-".repeat(25) + "-|"
  );
  
  for (const res of results) {
    const renameText = res.needsRename ? "SI" : "NO";
    const subcolsText = res.subcollections.length > 0 ? res.subcollections.join(", ") : "Ninguna";
    console.log(
      "| " +
      res.collection.padEnd(25) + " | " +
      res.docCount.toString().padEnd(8) + " | " +
      res.currentConvention.padEnd(12) + " | " +
      renameText.padEnd(8) + " | " +
      res.proposedCamelCaseName.padEnd(25) + " | " +
      subcolsText.padEnd(25) + " |"
    );
  }
  console.log("--------------------------------\n");

  // Output JSON report to scripts/audit/collections-report.json
  const outputDir = path.resolve(process.cwd(), "scripts/audit");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const reportPath = path.join(outputDir, "collections-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), "utf8");
  console.log(`💾 Report saved to: ${reportPath}`);
}

run().catch((err) => {
  console.error("❌ Collection audit failed:", err);
  process.exit(1);
});
