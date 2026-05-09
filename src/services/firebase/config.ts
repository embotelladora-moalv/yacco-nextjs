// src/services/firebase/config.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  connectFirestoreEmulator,
  Firestore,
  getFirestore,
} from "firebase/firestore";
import { Auth, connectAuthEmulator, getAuth } from "firebase/auth";
import {
  getStorage,
  FirebaseStorage,
  connectStorageEmulator,
} from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Singleton pattern to avoid re-initializing Firebase in Next.js hot reloads
const firebaseApp = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();

const auth: Auth = getAuth(firebaseApp);
const db: Firestore = getFirestore(firebaseApp);
const storage: FirebaseStorage = getStorage(firebaseApp);

// // --- CONFIGURACIÓN DE EMULADORES (SOLO DESARROLLO) ---
// // Usamos '127.0.0.1' para evitar problemas de resolución de 'localhost' en algunos sistemas
// if (process.env.NODE_ENV === "development") {
//   connectFirestoreEmulator(db, "127.0.0.1", 8080);
//   connectAuthEmulator(auth, "http://127.0.0.1:9099");
//   connectStorageEmulator(storage, "127.0.0.1", 9199);
//   console.log("🚀 Conectado a Firebase Local Emulators");
// }

export { firebaseApp, db, auth, storage };
