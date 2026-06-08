import admin from 'firebase-admin';

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp({ projectId: 'demo-yacco' });
}
const db = admin.firestore();

async function seed() {
  console.log("Sembrando settings LEGACY (string[])...");
  
  await db.doc('systemSettings/config').set({
    clientTags: ["VIP", "Frecuente"],
    productionWasteReasons: [
      "Falla de sellado (Legacy)",
      "Roto en planta (Legacy)"
    ],
    routeWasteReasons: [
      "Caida (Legacy)",
      "Perdido (Legacy)"
    ],
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  console.log("Cargando repositorio para verificar normalización...");
  const { settingsRepository } = await import('../../src/services/repositories/settingsRepository');
  const settings = await settingsRepository.getSettings();

  console.log("\n=== RESULTADO NORMALIZACIÓN ===");
  console.log("Production Reasons (Objeto esperado):");
  console.log(JSON.stringify(settings.productionWasteReasons, null, 2));
  
  console.log("\nRoute Reasons (Objeto esperado):");
  console.log(JSON.stringify(settings.routeWasteReasons, null, 2));

  // Verificar que clientTags siguen siendo strings
  console.log("\nClient Tags (String esperado):");
  console.log(JSON.stringify(settings.clientTags, null, 2));
}

seed().catch(console.error);