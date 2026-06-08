import admin from 'firebase-admin';

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp({
    projectId: 'demo-yacco',
  });
}
const db = admin.firestore();

async function countSales() {
  try {
    const snapshot = await db.collection('sales').count().get();
    console.log(`Total sales in emulator: ${snapshot.data().count}`);
  } catch (error) {
    console.error("Error running count:", error);
  }
}

countSales();