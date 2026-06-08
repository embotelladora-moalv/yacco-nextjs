import admin from 'firebase-admin';

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'demo-yacco' });
}
const db = admin.firestore();

async function readSettings() {
  const doc = await db.doc('systemSettings/config').get();
  if (!doc.exists) {
    console.log("El documento systemSettings/config no existe en el emulador.");
  } else {
    console.log(JSON.stringify(doc.data(), null, 2));
  }
}

readSettings();
