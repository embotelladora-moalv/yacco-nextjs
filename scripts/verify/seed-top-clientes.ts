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
  console.log("Limpiando datos anteriores en emulador...");
  // Omitimos borrar todo por seguridad de la estructura, crearemos IDs específicos para evitar conflictos
  
  const now = new Date();
  const tsNow = admin.firestore.Timestamp.fromDate(now);

  console.log("Creando clientes...");
  // 1. Activo con deuda alta
  await db.collection('customers').doc('c-deudor-alto').set({
    name: "Juan Perez",
    alias: "Bodega Juanita",
    isActive: true,
    debtAmount: 5000.50,
  });

  // 2. Activo con deuda media
  await db.collection('customers').doc('c-deudor-medio').set({
    name: "Maria Lopez",
    isActive: true,
    debtAmount: 1500.00,
  });

  // 3. Activo sin deuda
  await db.collection('customers').doc('c-sindeuda').set({
    name: "Carlos Sanchez",
    isActive: true,
    debtAmount: 0,
  });

  // 4. Inactivo con deuda (NO DEBE SALIR)
  await db.collection('customers').doc('c-inactivo-deuda').set({
    name: "Empresa Fantasma",
    isActive: false,
    debtAmount: 10000.00,
  });

  console.log("Creando ventas del mes...");
  const salesRef = db.collection('sales');

  // Venta 1 para Juan Perez (COMPLETED)
  await salesRef.add({
    customerId: 'c-deudor-alto',
    customerName: 'Juan Perez',
    customerAlias: 'Bodega Juanita',
    totalAmount: 1000,
    status: 'COMPLETED',
    createdAt: tsNow,
  });

  // Venta 2 para Juan Perez (COMPLETED) - Se acumula
  await salesRef.add({
    customerId: 'c-deudor-alto',
    customerName: 'Juan Perez',
    customerAlias: 'Bodega Juanita',
    totalAmount: 500,
    status: 'COMPLETED',
    createdAt: tsNow,
  });

  // Venta para Maria Lopez (COMPLETED)
  await salesRef.add({
    customerId: 'c-deudor-medio',
    customerName: 'Maria Lopez',
    totalAmount: 2500,
    status: 'COMPLETED',
    createdAt: tsNow,
  });

  // Venta CANCELLED (NO DEBE SUMAR)
  await salesRef.add({
    customerId: 'c-deudor-medio',
    customerName: 'Maria Lopez',
    totalAmount: 5000,
    status: 'CANCELLED',
    createdAt: tsNow,
  });

  // Venta DELIVERED legacy (NO DEBE SUMAR)
  await salesRef.add({
    customerId: 'c-sindeuda',
    customerName: 'Carlos Sanchez',
    totalAmount: 3000,
    status: 'DELIVERED',
    createdAt: tsNow,
  });

  console.log("Datos sembrados. Obteniendo resultados...");

  const { customerRepository } = await import('../../src/services/repositories/customerRepository');
  const topDebtors = await customerRepository.getTopDebtors(5);
  console.log("\n=== TOP DEUDORES ===");
  console.table(topDebtors);

  const { salesRepository } = await import('../../src/services/repositories/salesRepository');
  const topVolume = await salesRepository.getTopCustomersByVolumeCurrentMonth(5);
  console.log("\n=== TOP VOLUMEN MES ===");
  console.table(topVolume);
}

seed().catch(console.error);