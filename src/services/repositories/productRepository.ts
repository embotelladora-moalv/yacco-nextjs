// src/services/repositories/productRepository.ts
import { adminDb } from "../firebase/admin";
import admin from "firebase-admin";
import { Product } from "@/core/entities/Product";
import { ProductFormValues } from "@/core/validations/productSchema";

const COLLECTION_NAME = "products";

export const productRepository = {
  // 1. Crear un producto (Create) desde el servidor
  async create(data: ProductFormValues): Promise<string> {
    const productsRef = adminDb.collection(COLLECTION_NAME);

    const newProduct = {
      ...data,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await productsRef.add(newProduct);
    return docRef.id;
  },

  // 2. Obtener todos los productos activos (Read)
  async getActiveProducts(): Promise<Product[]> {
    const snapshot = await adminDb
      .collection(COLLECTION_NAME)
      .where("isActive", "==", true)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as Product;
    });
  },

  // 3. Eliminación Lógica (Soft Delete)
  async softDelete(id: string): Promise<void> {
    const productRef = adminDb.collection(COLLECTION_NAME).doc(id);
    await productRef.update({
      isActive: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  },

  async getAll(): Promise<Product[]> {
    const snapshot = await adminDb
      .collection(COLLECTION_NAME)
      .where("isActive", "==", true)
      //.orderBy("name", "asc") // Descomenta esto si ya tienes un índice en Firebase
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as Product;
    });
  },
};

export async function getActiveProductsAction() {
  try {
    const products = await productRepository.getActiveProducts();
    // Next.js serializa la data de forma segura y se la envía al navegador
    return { success: true, data: products };
  } catch (error) {
    console.error("Error al obtener productos:", error);
    return { success: false, data: [] };
  }
}
