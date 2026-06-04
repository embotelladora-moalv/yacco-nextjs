// scripts/migration/connections.ts
// Inicializa y exporta las dos conexiones de Firestore: vieja y nueva.
//
// Autenticación nueva:
//   Opción A (recomendada): NEW_SA_PATH=/ruta/al/nuevo-service-account.json
//   Opción B: vars individuales FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

const HOME = process.env.HOME || process.env.USERPROFILE || "";

// ── Proyecto VIEJO ──────────────────────────────────────────────────────────
const OLD_SA_PATH =
  process.env.OLD_SA_PATH ||
  path.resolve(HOME, "Desktop/claude-staging/keys/old-service-account.json");

if (!fs.existsSync(OLD_SA_PATH)) {
  console.error(`❌ Service account VIEJO no encontrado: ${OLD_SA_PATH}`);
  console.error(`   Seteá: OLD_SA_PATH=/ruta/al/old-service-account.json`);
  process.exit(1);
}
const oldSA = JSON.parse(fs.readFileSync(OLD_SA_PATH, "utf8"));

const oldApp = admin.initializeApp(
  { credential: admin.credential.cert(oldSA) },
  "old"
);

// ── Proyecto NUEVO ──────────────────────────────────────────────────────────
const NEW_SA_PATH = process.env.NEW_SA_PATH;

let newCredential: admin.credential.Credential;

if (NEW_SA_PATH) {
  if (!fs.existsSync(NEW_SA_PATH)) {
    console.error(`❌ Service account NUEVO no encontrado: ${NEW_SA_PATH}`);
    process.exit(1);
  }
  const newSA = JSON.parse(fs.readFileSync(NEW_SA_PATH, "utf8"));
  newCredential = admin.credential.cert(newSA);
} else {
  const projectId  = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey     = process.env.FIREBASE_PRIVATE_KEY ?? "";
  // Normalizar newlines: dotenvx puede dejar \n literales mezclados con reales
  const privateKey = rawKey.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey.includes("BEGIN PRIVATE KEY")) {
    console.error("❌ Credenciales del proyecto NUEVO incompletas.");
    console.error("   Opción A: NEW_SA_PATH=/ruta/nuevo-service-account.json");
    console.error("   Opción B: FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY (completa)");
    process.exit(1);
  }
  newCredential = admin.credential.cert({ projectId, clientEmail, privateKey });
}

const newApp = admin.initializeApp({ credential: newCredential }, "new");

export const oldDb = oldApp.firestore();
export const newDb = newApp.firestore();
export const oldProjectId = oldSA.project_id as string;
export const newProjectId =
  process.env.FIREBASE_PROJECT_ID ?? (newCredential as any)?.certificate?.projectId ?? "nuevo";
