// src/services/firebase/admin.ts
import admin from "firebase-admin";
import serviceAccount from "../../../serviceAccount.json";

if (!admin.apps.length) {
  try {
    // Si estamos en desarrollo, el SDK usará las variables de entorno para emuladores
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as any),
    });

    if (process.env.FIRESTORE_EMULATOR_HOST) {
      console.log("🔥 Firebase Admin operando sobre Firestore Emulator");
    } else {
      console.log("🔥 Firebase Admin inicializado (Producción/Cloud)");
    }
  } catch (error) {
    console.error("❌ Error inicializando Firebase Admin:", error);
  }
}

const adminDb = admin.firestore();
const adminAuth = admin.auth();

export { adminDb, adminAuth };
