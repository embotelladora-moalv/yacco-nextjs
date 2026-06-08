import admin from 'firebase-admin';

// Initialize Firebase Admin (adjust path/env as needed for emulator connection)
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp({
    projectId: 'demo-yacco', // Assuming this based on common setup, adjust if needed
  });
}
const db = admin.firestore();

async function countSales() {
  const now = new Date();
  
  // Set to start of month in Peru timezone (UTC-5)
  // Simple approach: get UTC start of month, add 5 hours for Peru equivalent if needed, 
  // or use basic JS date manipulation (assuming server time isn't strictly Peru right now,
  // we can just construct the ISO strings)
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  // Approximate start of month UTC-5
  const startOfMonth = new Date(Date.UTC(currentYear, currentMonth, 1, 5, 0, 0)); 
  
  // Next month start
  const endOfMonth = currentMonth === 11 
    ? new Date(Date.UTC(currentYear + 1, 0, 1, 5, 0, 0))
    : new Date(Date.UTC(currentYear, currentMonth + 1, 1, 5, 0, 0));

  console.log(`Counting sales between ${startOfMonth.toISOString()} and ${endOfMonth.toISOString()}`);

  try {
    const snapshot = await db.collection('sales')
      .where('status', '==', 'COMPLETED')
      .where('createdAt', '>=', startOfMonth)
      .where('createdAt', '<', endOfMonth)
      .count()
      .get();
      
    console.log(`Count in emulator: ${snapshot.data().count}`);
  } catch (error) {
    console.error("Error running count:", error);
  }
}

countSales();
