import admin from 'firebase-admin';

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'demo-yacco' });
}
const db = admin.firestore();

async function inspectShrinkage() {
  console.log("=== INSPECCIONANDO SHRINKAGE REASONS ===");
  const snap = await db.collection('shrinkageReasons').get();
  if (snap.empty) {
    console.log("Colección vacía.");
  } else {
    snap.docs.forEach(doc => {
      console.log(`ID: ${doc.id}`);
      console.log(JSON.stringify(doc.data(), null, 2));
      console.log("---");
    });
  }
}

inspectShrinkage();