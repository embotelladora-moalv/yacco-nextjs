// src/services/repositories/inventoryRepository.ts
import { adminDb } from "../firebase/admin";
import { productRepository } from "./productRepository";

export type KardexItem = {
  id: string;
  productId: string;
  productName: string;
  packagingType: string;
  volumeCapacity: number;
  quantityFull: number;
  warehouseLocation: string;
  lastUpdatedAt: Date;
};

export const inventoryRepository = {
  async getKardex(): Promise<KardexItem[]> {
    // 1. Traemos todo el inventario
    const inventorySnapshot = await adminDb.collection("inventory_items").get();

    // 2. Traemos los productos para obtener sus nombres
    const products = await productRepository.getActiveProducts();

    // Creamos un diccionario para buscar productos rápido por su ID
    const productMap = new Map(products.map((p) => [p.id, p]));

    // 3. Unimos los datos
    return inventorySnapshot.docs.map((doc) => {
      const data = doc.data();
      const product = productMap.get(data.productId);

      return {
        id: doc.id,
        productId: data.productId,
        quantityFull: data.quantityFull || 0,
        warehouseLocation: data.warehouseLocation || "No asignada",
        lastUpdatedAt: data.lastUpdatedAt?.toDate() || new Date(),
        // Datos cruzados del producto
        productName: product?.name || "Producto Desconocido",
        packagingType: product?.packagingType || "N/A",
        volumeCapacity: product?.volumeCapacity || 0,
      };
    });
  },
};
