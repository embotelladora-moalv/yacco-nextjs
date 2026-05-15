// import admin from "firebase-admin";
// import serviceAccount from "../../../serviceAccount.json";

// if (!admin.apps.length) {
//   try {
//     // Si estamos en desarrollo, el SDK usará las variables de entorno para emuladores
//     admin.initializeApp({
//       credential: admin.credential.cert(serviceAccount as any),
//     });

//     if (process.env.FIRESTORE_EMULATOR_HOST) {
//       console.log("🔥 Firebase Admin operando sobre Firestore Emulator");
//     } else {
//       console.log("🔥 Firebase Admin inicializado (Producción/Cloud)");
//     }
//   } catch (error) {
//     console.error("❌ Error inicializando Firebase Admin:", error);
//   }
// }

// const adminDb = admin.firestore();
// const adminAuth = admin.auth();

// export { adminDb, adminAuth };

// src/lib/firebase/serverApp.ts
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  // Verificamos si estamos usando el emulador
  const isEmulator = process.env.FIRESTORE_EMULATOR_HOST;

  admin.initializeApp({
    // Si estamos en el emulador, solo pasamos el projectId (Firebase ignora las credenciales locales)
    // Si estamos en producción, pasamos las credenciales completas
    ...(isEmulator
      ? { projectId: process.env.FIREBASE_PROJECT_ID || "demo-project" }
      : {
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
          }),
        }),
  });
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export const adminStorage = admin.storage(); // <-- ESTA LÍNEA ES LA QUE USAMOS HOY
