import { adminDb } from "../firebase/admin";
import admin from "firebase-admin";
import { RouteLoadFormValues } from "@/core/validations/routeLoadSchema";

export const routeLoadRepository = {
  /**
   * Ejecuta la carga de inventario al camión usando una Transacción.
   * 1. Verifica stock disponible en planta.
   * 2. Resta el stockFilled de Products.
   * 3. Guarda el historial de carga (RouteLoad).
   * 4. Suma el inventario a la DailyRoute (para que la App Flutter lo vea).
   */
  async loadTruckTransaction(
    data: RouteLoadFormValues,
    userId: string,
  ): Promise<void> {
    await adminDb.runTransaction(async (transaction) => {
      const routeRef = adminDb.collection("daily_routes").doc(data.routeId);
      const routeDoc = await transaction.get(routeRef);

      if (!routeDoc.exists)
        throw new Error("La ruta no existe o ya fue cerrada.");

      const routeData = routeDoc.data()!;
      let currentInventory = routeData.currentInventory || {}; // Inventario móvil actual del camión

      // 1. Verificar stock y preparar actualizaciones de productos
      const productUpdates = [];

      for (const item of data.items) {
        const productRef = adminDb.collection("products").doc(item.productId);
        const productDoc = await transaction.get(productRef);

        if (!productDoc.exists)
          throw new Error(`Producto ${item.productId} no encontrado.`);

        const productData = productDoc.data()!;
        if (productData.stockFilled < item.quantity) {
          throw new Error(
            `Stock insuficiente para ${productData.name}. Disponible: ${productData.stockFilled}`,
          );
        }

        // Preparamos los datos para actualizar Planta y Camión
        productUpdates.push({
          ref: productRef,
          newStock: productData.stockFilled - item.quantity,
        });

        // Sumar al inventario del camión (DailyRoute)
        currentInventory[item.productId] =
          (currentInventory[item.productId] || 0) + item.quantity;
      }

      // 2. Aplicar los descuentos en la colección Products (Planta)
      for (const update of productUpdates) {
        transaction.update(update.ref, {
          stockFilled: update.newStock,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // 3. Actualizar el inventario móvil en la colección DailyRoute
      transaction.update(routeRef, {
        currentInventory,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 4. Registrar el evento en la colección RouteLoads (Auditoría/Kardex)
      const loadRef = adminDb.collection("route_loads").doc();
      transaction.set(loadRef, {
        routeId: data.routeId,
        truckId: routeData.truckId,
        items: data.items,
        createdBy: userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
  },
};
