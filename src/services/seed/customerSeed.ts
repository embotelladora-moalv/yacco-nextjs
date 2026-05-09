// src/services/seed/customerSeed.ts
import { adminDb } from "../firebase/admin";
import admin from "firebase-admin";
import { v4 as uuidv4 } from "uuid";

const businessTypes = [
  "Bodega",
  "Restaurante",
  "Farmacia",
  "Lavandería",
  "Hostal",
  "Gimnasio",
];
const names = [
  "Don Lucho",
  "Santa Rosa",
  "El Porvenir",
  "La Economía",
  "Pucallpa Mar",
  "Los Amigos",
];
const categories = ["Parque", "Industrial", "Residencial", "Centro"];

// Coordenadas base (Pucallpa y Lima)
const locations = [
  { city: "Pucallpa", lat: -8.38, lng: -74.55 },
  { city: "Lima", lat: -12.04, lng: -77.04 },
];

export async function seedManyCustomers(count: number = 100) {
  const batch = adminDb.batch();
  const customersRef = adminDb.collection("customers");

  for (let i = 0; i < count; i++) {
    const type =
      businessTypes[Math.floor(Math.random() * businessTypes.length)];
    const name = names[Math.floor(Math.random() * names.length)];
    const alias = `${type} ${name} ${i + 1}`;
    const baseLoc = locations[Math.floor(Math.random() * locations.length)];

    // Generar coordenadas aleatorias cercanas a la base
    const latitude = baseLoc.lat + (Math.random() - 0.5) * 0.05;
    const longitude = baseLoc.lng + (Math.random() - 0.5) * 0.05;

    const customerData = {
      documentType: Math.random() > 0.3 ? "RUC" : "DNI",
      documentNumber:
        Math.random() > 0.3
          ? `20${Math.floor(100000000 + Math.random() * 900000000)}`
          : `${Math.floor(10000000 + Math.random() * 90000000)}`,
      businessName: `${alias} S.A.C.`,
      alias: alias,
      legalAddress: `Jr. Libertad ${Math.floor(Math.random() * 1000)}, ${baseLoc.city}`,
      categoryTag: categories[Math.floor(Math.random() * categories.length)],
      isActive: true,
      locations: [
        {
          id: uuidv4(),
          alias: "Punto Principal",
          address: `Calle Secundaria ${Math.floor(Math.random() * 500)}`,
          latitude,
          longitude,
        },
      ],
      contacts: [
        {
          id: uuidv4(),
          name: "Juan Perez",
          phone: "9" + Math.floor(10000000 + Math.random() * 90000000),
          role: "Administrador",
        },
      ],
      stats: {
        currentDebt: Math.random() > 0.7 ? Math.random() * 500 : 0,
        loanedBottles: Math.floor(Math.random() * 20),
        orderFrequencyDays: Math.floor(Math.random() * 15) + 3,
        lastVisitDate: admin.firestore.Timestamp.fromDate(new Date()),
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const newDocRef = customersRef.doc();
    batch.set(newDocRef, customerData);
  }

  await batch.commit();
  return { success: true, message: `${count} clientes generados para Yacco.` };
}
