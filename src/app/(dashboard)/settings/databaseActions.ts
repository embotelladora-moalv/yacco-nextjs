// src/app/(dashboard)/settings/databaseActions.ts (o la ruta donde lo tengas)
"use server";

import { adminDb, adminAuth } from "@/services/firebase/admin";
import admin from "firebase-admin";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";

const collectionsToClear = [
  "systemSettings",
  "users",
  "products",
  "productionBatches",
  "kardexLogs",
  "dispatchManifests",
  "customers",
  "orders",
  "sales",
  "financeCategories",
  "cashMovements",
  "trucks", // NUEVO: Colección de camiones
];

// Función auxiliar para crear cuenta en Auth + Claims + Firestore
async function createSystemUser(name: string, email: string, roles: string[]) {
  let uid = "";
  try {
    // 1. Intentar crear en Auth (La contraseña será temporal: "Yacco2026*")
    const userRecord = await adminAuth.createUser({
      email,
      password: "Yacco2026*",
      displayName: name,
    });
    uid = userRecord.uid;
  } catch (error: any) {
    // Si el usuario ya existe, lo recuperamos
    if (error.code === "auth/email-already-exists") {
      const userRecord = await adminAuth.getUserByEmail(email);
      uid = userRecord.uid;
    } else {
      throw error;
    }
  }

  // 2. Inyectar Custom Claims
  await adminAuth.setCustomUserClaims(uid, { roles });

  // 3. Guardar en Firestore con el mismo UID
  await adminDb.collection("users").doc(uid).set({
    name,
    email,
    roles,
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return uid;
}

// Generador de coordenadas aleatorias cercanas a Lima
function getRandomLocation() {
  const lat = -12.0 + Math.random() * -0.2; // Rango aprox en Lima
  const lng = -76.9 + Math.random() * -0.2;
  return { lat, lng };
}

export async function resetAndSeedDatabaseAction() {
  try {
    // ==========================================
    // 1. LIMPIEZA TOTAL
    // ==========================================
    for (const collection of collectionsToClear) {
      const snapshot = await adminDb.collection(collection).get();
      if (!snapshot.empty) {
        const batch = adminDb.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }
    }

    // ==========================================
    // 2. CREACIÓN DE USUARIOS EN AUTH Y FIRESTORE
    // ==========================================
    // A. Administrador Principal (Para que no te quedes fuera)
    await createSystemUser("Admin General", "admin@moalv.com", ["ADMIN"]);

    // B. 5 Choferes
    const driverIds: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const uid = await createSystemUser(
        `Chofer ${i}`,
        `chofer${i}@moalv.com`,
        ["DRIVER"],
      );
      driverIds.push(uid);
    }

    // C. 5 Auxiliares
    for (let i = 1; i <= 5; i++) {
      await createSystemUser(`Auxiliar ${i}`, `auxiliar${i}@moalv.com`, [
        "ASSISTANT",
      ]);
    }

    // ==========================================
    // 3. CREACIÓN DE 10 CAMIONES (Adaptado a la entidad Truck)
    // ==========================================
    const truckBrands = ["Fuso", "Hino", "Isuzu", "Hyundai", "Volvo"];

    for (let i = 1; i <= 10; i++) {
      const brand = truckBrands[i % truckBrands.length];

      await adminDb.collection("trucks").add({
        plateNumber: `ABC-${100 + i}`, // Formato: ABC-101
        alias: `${brand} ${i % 2 === 0 ? "Blanco" : "Azul"}`, // Ej: Fuso Blanco
        capacity: 150, // Capacidad en bidones de 20L
        isActive: true, //
        createdAt: admin.firestore.FieldValue.serverTimestamp(), //
        updatedAt: admin.firestore.FieldValue.serverTimestamp(), //
      });
    }

    // ==========================================
    // 4. PRODUCTOS BASE
    // ==========================================
    const bidonRef = await adminDb.collection("products").add({
      name: "Bidón Moalv 20L",
      sku: "BID-20L",
      operationalCategory: "FULL_PRODUCT",
      packagingType: "Bidón 20L",
      volume: 20,
      unit: "L",
      isReturnableContainer: true,
      priceRefill: 8.0,
      priceFull: 25.0,
      priceEmpty: 17.0,
      stockFilled: 0,
      stockEmpty: 0,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const bidonId = bidonRef.id;

    // ==========================================
    // 5. GENERACIÓN DE 50 CLIENTES (CRM)
    // ==========================================
    const batchCustomers = adminDb.batch();

    for (let i = 1; i <= 50; i++) {
      const customerRef = adminDb.collection("customers").doc();
      const hasDebt = Math.random() > 0.5; // 50% de probabilidad de tener deuda

      batchCustomers.set(customerRef, {
        name: `Cliente Comercial ${i} S.A.C.`,
        alias: `Bodega ${i}`,
        documentType: i % 3 === 0 ? "RUC" : "DNI",
        documentNumber: `200000000${i < 10 ? "0" + i : i}`,
        contactName: `Contacto ${i}`,
        contactPhone: `999888${i < 10 ? "0" + i : i}`,
        debtAmount: hasDebt ? Math.floor(Math.random() * 200) + 20 : 0, // Deuda aleatoria
        containerBalances: [
          { productId: bidonId, balance: Math.floor(Math.random() * 10) }, // Envases prestados aleatorios
        ],
        locations: [
          {
            id: uuidv4(),
            name: "Local Principal",
            address: `Av. Principal ${i}00`,
            isMain: true,
            coordinates: getRandomLocation(),
          },
        ],
        tags: i % 5 === 0 ? ["VIP", "Mayorista"] : ["Bodega"],
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await batchCustomers.commit();

    // ==========================================
    // 6. AJUSTES Y CATEGORÍAS FINANCIERAS
    // ==========================================
    await adminDb
      .collection("systemSettings")
      .doc("config")
      .set({
        packagingTypes: ["Bidón 20L", "Bidón 7L", "Botella 1L", "Surtidor"],
        clientTags: ["VIP", "Bodega", "Empresa", "Mayorista"],
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    const finCategories = [
      { name: "Combustible", type: "EXPENSE", isActive: true },
      { name: "Peajes y Parqueo", type: "EXPENSE", isActive: true },
      { name: "Alimentación Choferes", type: "EXPENSE", isActive: true },
    ];

    for (const cat of finCategories) {
      await adminDb.collection("financeCategories").add({
        ...cat,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Refrescamos toda la app
    revalidatePath("/", "layout");

    return { success: true };
  } catch (error: any) {
    console.error("Error reseteando BD:", error);
    return { success: false, error: error.message };
  }
}
