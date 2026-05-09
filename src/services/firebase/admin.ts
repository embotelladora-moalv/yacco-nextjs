// src/services/firebase/admin.ts
import admin from "firebase-admin";

// Importamos el archivo JSON directamente.
// (TypeScript/Next.js se encargan de leer los saltos de línea \n a la perfección)
import serviceAccount from "../../../serviceAccount.json";

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      // @ts-ignore - Evitamos errores de tipado estrictos con el JSON
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("🔥 Firebase Admin inicializado (Vía archivo JSON)");
  } catch (error) {
    console.error("❌ Error inicializando Firebase Admin:", error);
  }
}

const adminDb = admin.firestore();
const adminAuth = admin.auth();

export { adminDb, adminAuth };
