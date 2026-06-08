import { dispatchRepository } from "@/services/repositories/dispatchRepository";
import { inventoryRepository } from "@/services/repositories/inventoryRepository";
import { adminDb } from "@/services/firebase/admin";
import admin from "firebase-admin";

async function testShrinkageArithmetic() {
  console.log("🚀 Iniciando test de aritmética de mermas...");

  const productId = "test-prod-shrinkage";
  const lotNumber = "LOT-TEST-001";
  
  // 1. SETUP: Limpiar y crear producto de prueba
  await adminDb.collection("products").doc(productId).set({
    name: "Producto Test Merma",
    stockFilled: 100,
    stockEmpty: 50,
    sku: "TEST-001",
    isActive: true,
  });

  await adminDb.collection("productionBatches").doc(lotNumber).set({
    productId,
    lotNumber,
    currentStock: 100,
    productionDate: admin.firestore.Timestamp.fromDate(new Date()),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log("✅ Setup completado. Stock Inicial: 100 lleno / 50 vacío.");

  // 2. DISPATCH: 10 unidades
  const manifestId = await dispatchRepository.createDispatch(
    "driver-1",
    "dispatcher-1",
    "ABC-123",
    [{ productId, quantityRequested: 10 }],
    "Test dispatch"
  );
  console.log(`✅ Despacho creado: ${manifestId}. Stock esperado: 90 lleno / 50 vacío.`);

  // Verificar stock post-dispatch
  const prodPostDispatch = (await adminDb.collection("products").doc(productId).get()).data();
  console.log(`📊 Stock Post-Dispatch: ${prodPostDispatch?.stockFilled} lleno / ${prodPostDispatch?.stockEmpty} vacío.`);

  // 3. LIQUIDATE: 
  // - 2 vuelven intactos
  // - 1 merma reciclable
  // - 1 merma no reciclable
  // -> Sold = 10 - 2 - 2 = 6
  // -> Stock Filled final esperado: 92 (100 inicial - 8 vendidos/perdidos)
  // -> Stock Empty final esperado: 51 (50 inicial + 1 reciclado)
  
  await dispatchRepository.liquidateDispatch(manifestId, {
    liquidationDate: new Date(),
    items: [{
      productId,
      lotNumber,
      quantityLoaded: 10,
      quantityReturnedFull: 2,
      waste: [
        { quantity: 1, reasonId: "reason-recic", isRecyclable: true },
        { quantity: 1, reasonId: "reason-no-recic", isRecyclable: false }
      ]
    }],
    returnedEmpties: []
  }, "user-1");

  console.log("✅ Liquidación completada.");

  // 4. VERIFICACIÓN FINAL
  const prodFinal = (await adminDb.collection("products").doc(productId).get()).data();
  const manifestFinal = await dispatchRepository.getManifestById(manifestId);
  
  if (!manifestFinal) {
    throw new Error("❌ Error: No se pudo recuperar el manifiesto final.");
  }

  const itemFinal = manifestFinal.items[0];

  console.log("--- RESULTADOS FINALES ---");
  console.log(`📦 Stock Lleno: ${prodFinal?.stockFilled} (Esperado: 92)`);
  console.log(`🗑️ Stock Vacío: ${prodFinal?.stockEmpty} (Esperado: 51)`);
  console.log(`💰 Cantidad Vendida (item): ${itemFinal.quantitySold} (Esperado: 6)`);
  console.log(`⚠️ Merma Total (item): ${itemFinal.wasteQuantity} (Esperado: 2)`);
  
  // Verificar Kardex
  const kardexSnap = await adminDb.collection("kardexLogs")
    .where("referenceId", "==", manifestId)
    .orderBy("createdAt", "asc")
    .get();
  
  console.log(`📝 Asientos de Kardex creados: ${kardexSnap.size}`);
  kardexSnap.forEach(doc => {
    const d = doc.data();
    console.log(`   [${d.type}/${d.phase}] Delta: ${d.delta} | Result: ${d.resultingBalance} | Ref: ${d.referenceType}`);
  });

  const success = prodFinal?.stockFilled === 92 && 
                  prodFinal?.stockEmpty === 51 && 
                  itemFinal.quantitySold === 6;

  if (success) {
    console.log("🎉 TEST EXITOSO: La aritmética de mermas es correcta.");
  } else {
    console.log("❌ TEST FALLIDO: Revisar aritmética.");
  }
}

testShrinkageArithmetic().catch(console.error);
