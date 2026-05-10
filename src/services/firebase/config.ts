// src/services/firebase/config.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const firebaseApp = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();

const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

// --- CONFIGURACIÓN PARA EL EMULADOR ---
if (process.env.NODE_ENV === "development") {
  // Conectar Firestore al puerto 8080
  connectFirestoreEmulator(db, "127.0.0.1", 8080);

  // Conectar Auth al puerto 9099
  connectAuthEmulator(auth, "http://127.0.0.1:9099");

  // Conectar Storage al puerto 9199
  connectStorageEmulator(storage, "127.0.0.1", 9199);

  console.log("🚀 Cliente conectado a Firebase Local Emulators");
}

export { firebaseApp, db, auth, storage };
