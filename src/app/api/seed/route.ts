import { NextResponse } from "next/server";
import { adminDb } from "@/services/firebase/admin";
import admin from "firebase-admin";

export async function GET(request: Request) {
  try {
    // 0. Protecciones de seguridad
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const token = request.headers.get("x-seed-token");
    if (!token || token !== process.env.SEED_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    // 1. CREAR PRODUCTOS
    const productsData = [
      {
        name: "Bidón 20L con caño",
        sku: "BD20-C",
        basePrice: 15.0,
        stockFilled: 250,
        stockEmpty: 50,
        isActive: true,
      },
      {
        name: "Bidón 20L sin caño",
        sku: "BD20-S",
        basePrice: 14.0,
        stockFilled: 300,
        stockEmpty: 80,
        isActive: true,
      },
      {
        name: "Bidón 7L",
        sku: "BD07",
        basePrice: 8.0,
        stockFilled: 100,
        stockEmpty: 20,
        isActive: true,
      },
      {
        name: "Caja Agua 1L x 15",
        sku: "CJ1L-15",
        basePrice: 22.0,
        stockFilled: 50,
        stockEmpty: 0,
        isActive: true,
      },
    ];

    const productRefs = [];
    for (const p of productsData) {
      const ref = adminDb.collection("products").doc();
      await ref.set({ ...p, createdAt: timestamp, updatedAt: timestamp });
      productRefs.push({ id: ref.id, ...p });
    }

    // 2. CREAR USUARIOS (Choferes y Auxiliares)
    const usersData = [
      {
        name: "Juan",
        lastName: "Rayme",
        role: "DRIVER",
        email: "juan@moalv.com",
        isActive: true,
      },
      {
        name: "Carlos",
        lastName: "Sánchez",
        role: "DRIVER",
        email: "carlos@moalv.com",
        isActive: true,
      },
      {
        name: "Luis",
        lastName: "Pérez",
        role: "ASSISTANT",
        email: "luis@moalv.com",
        isActive: true,
      },
    ];

    const userRefs = [];
    for (const u of usersData) {
      const ref = adminDb.collection("users").doc();
      await ref.set({ ...u, createdAt: timestamp, updatedAt: timestamp });
      userRefs.push({ id: ref.id, ...u });
    }

    // 3. CREAR CAMIONES
    const trucksData = [
      {
        alias: "Camión Blanco Chico",
        plateNumber: "ATD-949",
        capacity: 150,
        isActive: true,
      },
      {
        alias: "Camión Azul Grande",
        plateNumber: "BXZ-123",
        capacity: 300,
        isActive: true,
      },
    ];

    const truckRefs = [];
    for (const t of trucksData) {
      const ref = adminDb.collection("trucks").doc();
      await ref.set({ ...t, createdAt: timestamp, updatedAt: timestamp });
      truckRefs.push({ id: ref.id, ...t });
    }

    // 4. CREAR CLIENTES (Con coordenadas reales para probar el mapa)
    const customersData = [
      {
        type: "COMPANY",
        documentId: "20613042394",
        name: "Rosimo Inversiones E.I.R.L.",
        phone: "999888777",
        tags: ["VIP", "MAYORISTA"],
        debtAmount: 45.0, // Le pondremos deuda para probar cobranzas
        loanedItems: {},
        customPrices: {},
        locations: [
          {
            id: "loc_1",
            name: "Almacén Principal",
            address: "Av. Industrial 456, Pucallpa",
            latitude: -8.3791,
            longitude: -74.5539,
            isDefault: true,
            // Contacto amarrado a la ubicación
            contact: {
              id: "cl_1",
              name: "Roberto Almacén",
              phone: "955444333",
              role: "Jefe de Almacén",
            },
          },
          {
            id: "loc_2",
            name: "Oficina Centro",
            address: "Jr. Tarapacá 123, Pucallpa",
            latitude: -8.382,
            longitude: -74.538,
            isDefault: false,
            contact: {
              id: "cl_2",
              name: "Sofía Recepción",
              phone: "922111000",
              role: "Recepcionista",
            },
          },
        ],
        contacts: [
          { id: "c_1", name: "Admin", phone: "999111222", role: "Gerente" },
        ],
        isActive: true,
      },
      {
        type: "INDIVIDUAL",
        documentId: "70123456",
        name: "María Gonzales",
        phone: "987654321",
        tags: ["PARQUE", "CASA"],
        debtAmount: 0,
        loanedItems: {},
        customPrices: { [productRefs[0].id]: 14.5 }, // Precio especial para ella en bidón con caño
        locations: [
          {
            id: "loc_3",
            name: "Casa",
            address: "Jr. Los Cedros 789, Lima",
            reference: "Casa blanca dos pisos",
            latitude: -12.1211,
            longitude: -77.0298,
            isDefault: true,
          },
        ],
        contacts: [],
        isActive: true,
      },
    ];

    const customerRefs = [];
    for (const c of customersData) {
      const ref = adminDb.collection("customers").doc();
      await ref.set({ ...c, createdAt: timestamp, updatedAt: timestamp });
      customerRefs.push({ id: ref.id, ...c });
    }

    // 5. CREAR PEDIDOS (Reservas y Entregados)
    const ordersData = [
      {
        customerId: customerRefs[0].id,
        type: "PRE_ORDER",
        status: "RESERVED",
        items: [
          {
            productId: productRefs[0].id,
            productName: productRefs[0].name,
            quantity: 10,
            unitPrice: 15.0,
            subtotal: 150.0,
          },
        ],
        totalAmount: 150.0,
        paymentMethod: "TRANSFER",
        paymentStatus: "PENDING",
        amountPaid: 0,
        scheduledDate: new Date().toISOString().split("T")[0],
      },
      {
        customerId: customerRefs[1].id,
        type: "ROUTE_SALE",
        status: "DELIVERED",
        items: [
          {
            productId: productRefs[0].id,
            productName: productRefs[0].name,
            quantity: 2,
            unitPrice: 14.5,
            subtotal: 29.0,
          },
        ],
        totalAmount: 29.0,
        paymentMethod: "CASH",
        paymentStatus: "PAID",
        amountPaid: 29.0,
        scheduledDate: new Date().toISOString().split("T")[0],
        deliveredAt: timestamp,
      },
    ];

    for (const o of ordersData) {
      const ref = adminDb.collection("orders").doc();
      await ref.set({ ...o, createdAt: timestamp, updatedAt: timestamp });
    }

    return NextResponse.json({
      success: true,
      message: "¡Base de datos inyectada con éxito! Revisa tu sistema.",
    });
  } catch (error: any) {
    console.error("Error in seed:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
