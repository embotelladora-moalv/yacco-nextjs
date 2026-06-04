// src/services/repositories/productRepository.ts
import { adminDb } from "../firebase/admin";
import admin from "firebase-admin";
import { Product } from "@/core/entities/Product";
import { ProductFormValues } from "@/core/validations/productSchema";
import { serializeFirestoreData } from "@/services/firebase/serialization";

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

    return snapshot.docs.map((doc) =>
      serializeFirestoreData({
        id: doc.id,
        ...doc.data(),
      }),
    );
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
      .orderBy("name", "asc")
      .get();

    return snapshot.docs.map((doc) =>
      serializeFirestoreData({
        id: doc.id,
        ...doc.data(),
      }),
    );
  },

  /**
   * Obtiene un producto por su ID para el formulario de Edición.
   */
  async getById(id: string): Promise<Product | null> {
    const doc = await adminDb.collection(COLLECTION_NAME).doc(id).get();
    if (!doc.exists) return null;

    const data = doc.data()!;
    return serializeFirestoreData({
      id: doc.id,
      ...data,
    });
  },

  /**
   * Actualiza los datos de un SKU existente.
   */
  async update(id: string, data: Partial<ProductFormValues>): Promise<void> {
    await adminDb
      .collection(COLLECTION_NAME)
      .doc(id)
      .update({
        ...data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
  },

  /**
   * Borrado Lógico: Oculta el producto sin afectar facturas ni Kardex antiguo.
   */
  async deactivate(id: string): Promise<void> {
    await adminDb.collection(COLLECTION_NAME).doc(id).update({
      isActive: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
