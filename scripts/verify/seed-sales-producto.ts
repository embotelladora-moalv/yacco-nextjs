import admin from 'firebase-admin';

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp({
    projectId: 'demo-yacco',
  });
}
const db = admin.firestore();

async function seed() {
  const now = new Date(); // Este es el momento actual de Perú aprox o UTC equivalente.
  const tsNow = admin.firestore.Timestamp.fromDate(now);

  console.log("Creando productos...");
  const p1 = db.collection('products').doc('p-agua-20l');
  const p2 = db.collection('products').doc('p-hielo-bolsa');
  const p3 = db.collection('products').doc('p-dispensador');
  
  await p1.set({ name: "Agua 20L" });
  await p2.set({ name: "Hielo en Bolsa" });
  await p3.set({ name: "Dispensador" });

  console.log("Creando ventas...");
  const salesRef = db.collection('sales');

  // 1. COMPLETED: 10 Agua (200), 5 Hielo (50)
  await salesRef.add({
    status: "COMPLETED",
    createdAt: tsNow,
    items: [
      { productId: "p-agua-20l", quantity: 10, subtotal: 200 },
      { productId: "p-hielo-bolsa", quantity: 5, subtotal: 50 },
    ]
  });

  // 2. COMPLETED: 5 Agua (100)
  await salesRef.add({
    status: "COMPLETED",
    createdAt: tsNow,
    items: [
      { productId: "p-agua-20l", quantity: 5, subtotal: 100 },
    ]
  });

  // 3. COMPLETED: 2 Dispensador (1000)
  await salesRef.add({
    status: "COMPLETED",
    createdAt: tsNow,
    items: [
      { productId: "p-dispensador", quantity: 2, subtotal: 1000 },
    ]
  });

  // 4. COMPLETED with unknown product: 3 p-unknown (300)
  await salesRef.add({
    status: "COMPLETED",
    createdAt: tsNow,
    items: [
      { productId: "p-unknown", quantity: 3, subtotal: 300 },
    ]
  });

  // 5. CANCELLED: shouldn't be counted. 10 Agua (200)
  await salesRef.add({
    status: "CANCELLED",
    createdAt: tsNow,
    items: [
      { productId: "p-agua-20l", quantity: 10, subtotal: 200 },
    ]
  });

  // 6. DELIVERED (legacy): shouldn't be counted. 10 Agua (200)
  await salesRef.add({
    status: "DELIVERED",
    createdAt: tsNow,
    items: [
      { productId: "p-agua-20l", quantity: 10, subtotal: 200 },
    ]
  });

  console.log("Datos sembrados con éxito.");

  // Verificar la funcionalidad
  console.log("Probando la obtención de datos del mes...");
  const { salesRepository } = await import('../../src/services/repositories/salesRepository');
  const results = await salesRepository.getProductSalesCurrentMonth();
  
  console.log("Resultado de getProductSalesCurrentMonth():");
  console.table(results);
}

seed().catch(console.error);