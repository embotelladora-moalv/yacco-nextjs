import { adminDb } from "../firebase/admin";
import admin from "firebase-admin";
import {
  Product,
  ProductionBatch,
  ShrinkageLog,
  KardexLog,
} from "@/core/entities/Inventory";
import { serializeFirestoreData } from "@/services/firebase/serialization";
import { unstable_cache, revalidateTag } from "next/cache";
import { paginate } from "./_pagination";

const PRODUCTS_COLLECTION = "products";
const KARDEX_COLLECTION = "kardexLogs";
const PRODUCTION_COLLECTION = "productionBatches";
const SHRINKAGE_COLLECTION = "shrinkageLogs";

export const inventoryRepository = {
  // ----------------------------------------------------------------
  // 1. GESTIÓN DE CATÁLOGO DE PRODUCTOS
  // ----------------------------------------------------------------
  getAllProducts: unstable_cache(
    async (): Promise<Product[]> => {
      const snapshot = await adminDb
        .collection(PRODUCTS_COLLECTION)
        .orderBy("name", "asc")
        .get();
      return snapshot.docs.map((doc) =>
        serializeFirestoreData({
          id: doc.id,
          ...doc.data(),
        }),
      );
    },
    ["products-catalog"],
    { revalidate: 3600, tags: ["products"] }
  ),

  async createProduct(data: any): Promise<string> {
    const ref = adminDb.collection(PRODUCTS_COLLECTION).doc();
    const { initialStockEmpty, initialStockFilled, ...cleanData } = data;
    await ref.set({
      ...cleanData,
      stockEmpty: initialStockEmpty || 0,
      stockFilled: initialStockFilled || 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    revalidateTag("products", "max");
    return ref.id;
  },

  // ----------------------------------------------------------------
  // 2. INGRESO DE COMPRAS (Suma de Vacíos)
  // ----------------------------------------------------------------
  async registerPurchase(
    productId: string,
    quantity: number,
    managerId: string,
  ): Promise<void> {
    await adminDb.runTransaction(async (transaction) => {
      const productRef = adminDb.collection(PRODUCTS_COLLECTION).doc(productId);
      const productDoc = await transaction.get(productRef);

      if (!productDoc.exists) throw new Error("Producto no encontrado");
      const currentStockEmpty = productDoc.data()?.stockEmpty || 0;

      // 1. Actualizar Stock del Producto
      transaction.update(productRef, {
        stockEmpty: currentStockEmpty + quantity,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 2. Registrar en el Kardex (Auditoría)
      const kardexRef = adminDb.collection(KARDEX_COLLECTION).doc();
      const kardexEntry: Omit<KardexLog, "id"> = {
        productId,
        type: "IN",
        phase: "EMPTY",
        quantity,
        referenceId: "COMPRA_DIRECTA", // Aquí luego podríamos vincular una Factura de Proveedor
        referenceType: "PURCHASE",
        previousStock: currentStockEmpty,
        newStock: currentStockEmpty + quantity,
        createdAt: new Date(),
        // Nuevos campos
        movementType: "PURCHASE",
        delta: quantity,
        resultingBalance: currentStockEmpty + quantity,
        userId: managerId || "SYSTEM",
      };
      transaction.set(kardexRef, kardexEntry);
    });
    revalidateTag("products", "max");
  },

  // ----------------------------------------------------------------
  // 3. REGISTRO DE PRODUCCIÓN (Convierte Vacíos en Llenos)
  // ----------------------------------------------------------------
  async registerProduction(
    batch: Omit<
      ProductionBatch,
      "id" | "createdAt" | "lotNumber" | "currentStock" | "updatedAt"
    >,
  ): Promise<void> {
    await adminDb.runTransaction(async (transaction) => {
      const productRef = adminDb
        .collection(PRODUCTS_COLLECTION)
        .doc(batch.productId);
      const productDoc = await transaction.get(productRef);

      if (!productDoc.exists) throw new Error("Producto no encontrado");

      const productData = productDoc.data() as Product;
      const currentEmpty = productData.stockEmpty;
      const currentFilled = productData.stockFilled;

      // Validar si es un envase retornable (Requiere vacíos para producir)
      if (
        productData.isReturnableContainer &&
        currentEmpty < batch.quantityProduced
      ) {
        throw new Error(
          `Stock insuficiente de envases vacíos. Disponibles: ${currentEmpty}`,
        );
      }

      // 1. GENERAR EL NÚMERO DE LOTE BASADO EN LA FECHA (YYYYMMDD)
      // Extraemos la fecha del objeto Date (Ej: "2026-05-10") y quitamos los guiones
      const dateIso = batch.productionDate.toISOString().split("T")[0];
      const dateStr = dateIso.replace(/-/g, "");
      const lotNumber = `L-${dateStr}`;

            // 2. BUSCAR SI YA EXISTE PRODUCCIÓN HOY PARA ESTE PRODUCTO
      const batchQuery = await transaction.get(
        adminDb
          .collection(PRODUCTION_COLLECTION)
          .where("productId", "==", batch.productId)
          .where("lotNumber", "==", lotNumber)
          .limit(1),
      );

      // Calcular la fecha de vencimiento si no se proporciona (default + 6 meses)
      const productionDateVal = batch.productionDate;
      let expirationDateVal = batch.expirationDate;
      if (!expirationDateVal) {
        const exp = new Date(productionDateVal);
        exp.setMonth(exp.getMonth() + 6);
        expirationDateVal = exp;
      }

      let batchRef;

      if (!batchQuery.empty) {
        // MODO ACUMULACIÓN: Ya se produjo algo hoy, solo sumamos
        batchRef = batchQuery.docs[0].ref;
        const existingData = batchQuery.docs[0].data();

        transaction.update(batchRef, {
          quantityProduced:
            existingData.quantityProduced + batch.quantityProduced,
          currentStock:
            (existingData.currentStock || 0) + batch.quantityProduced,
          expirationDate: existingData.expirationDate || expirationDateVal,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        // MODO NUEVO LOTE: Es la primera producción del día para este SKU
        batchRef = adminDb.collection(PRODUCTION_COLLECTION).doc();
        transaction.set(batchRef, {
          ...batch,
          expirationDate: expirationDateVal,
          lotNumber: lotNumber,
          currentStock: batch.quantityProduced, // El stock inicial es lo que acabamos de producir
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // ... (El código posterior donde actualizas los stocks del producto y el Kardex sigue igual)

      // 2. Actualizar Stocks
      const newEmpty = productData.isReturnableContainer
        ? currentEmpty - batch.quantityProduced
        : currentEmpty;
      const newFilled = currentFilled + batch.quantityProduced;

      transaction.update(productRef, {
        stockEmpty: newEmpty,
        stockFilled: newFilled,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 3. Registrar Kardex (Salida de Vacíos)
      if (productData.isReturnableContainer) {
        const kardexOutRef = adminDb.collection(KARDEX_COLLECTION).doc();
        transaction.set(kardexOutRef, {
          productId: batch.productId,
          type: "OUT",
          phase: "EMPTY",
          quantity: batch.quantityProduced,
          referenceId: batchRef.id,
          referenceType: "PRODUCTION",
          previousStock: currentEmpty,
          newStock: newEmpty,
          createdAt: new Date(),
          movementType: "PRODUCTION",
          delta: -batch.quantityProduced,
          resultingBalance: newEmpty,
          userId: batch.managerId || "SYSTEM",
        });
      }

      // 4. Registrar Kardex (Ingreso de Llenos)
      const kardexInRef = adminDb.collection(KARDEX_COLLECTION).doc();
      transaction.set(kardexInRef, {
        productId: batch.productId,
        type: "IN",
        phase: "FILLED",
        quantity: batch.quantityProduced,
        lotNumber: lotNumber,
        referenceId: batchRef.id,
        referenceType: "PRODUCTION",
        previousStock: currentFilled,
        newStock: newFilled,
        createdAt: new Date(),
        movementType: "PRODUCTION",
        delta: batch.quantityProduced,
        resultingBalance: newFilled,
        userId: batch.managerId || "SYSTEM",
      });
    });
    revalidateTag("products", "max");
  },

  // ----------------------------------------------------------------
  // 4. REGISTRO DE MERMA (Descuentos manuales por roturas)
  // ----------------------------------------------------------------
  async registerShrinkage(
    shrinkage: Omit<ShrinkageLog, "id" | "createdAt">,
  ): Promise<void> {
    await adminDb.runTransaction(async (transaction) => {
      const productRef = adminDb
        .collection(PRODUCTS_COLLECTION)
        .doc(shrinkage.productId);
      const productDoc = await transaction.get(productRef);

      if (!productDoc.exists) throw new Error("Producto no encontrado");
      const data = productDoc.data() as Product;

      if (shrinkage.phase === "EMPTY") {
        const currentEmpty = data.stockEmpty || 0;
        if (currentEmpty < shrinkage.quantity) {
          throw new Error(`Stock insuficiente para declarar merma de vacíos. Disponible: ${currentEmpty}`);
        }

        // 1. Actualizar Stock Vacío
        const newEmpty = currentEmpty - shrinkage.quantity;
        transaction.update(productRef, {
          stockEmpty: newEmpty,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 2. Guardar la Merma
        const shrinkageRef = adminDb.collection(SHRINKAGE_COLLECTION).doc();
        transaction.set(shrinkageRef, {
          ...shrinkage,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 3. Registrar Kardex OUT/EMPTY
        const kardexRef = adminDb.collection(KARDEX_COLLECTION).doc();
        transaction.set(kardexRef, {
          productId: shrinkage.productId,
          type: "OUT",
          phase: "EMPTY",
          quantity: shrinkage.quantity,
          referenceId: shrinkageRef.id,
          referenceType: "SHRINKAGE",
          previousStock: currentEmpty,
          newStock: newEmpty,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          movementType: "LOSS",
          delta: -shrinkage.quantity,
          resultingBalance: newEmpty,
          userId: shrinkage.managerId || "SYSTEM",
        });

      } else { // phase === "FILLED"
        if (!shrinkage.lotNumber) throw new Error("Se requiere lote para mermas de producto lleno.");
        
        // Obtener el lote
        const batchQuery = await transaction.get(
          adminDb
            .collection(PRODUCTION_COLLECTION)
            .where("productId", "==", shrinkage.productId)
            .where("lotNumber", "==", shrinkage.lotNumber)
            .limit(1)
        );

        if (batchQuery.empty) throw new Error(`Lote ${shrinkage.lotNumber} no encontrado.`);
        
        const batchRef = batchQuery.docs[0].ref;
        const batchData = batchQuery.docs[0].data() as ProductionBatch;
        
        const currentBatchStock = batchData.currentStock || 0;
        if (currentBatchStock < shrinkage.quantity) {
          throw new Error(`Stock insuficiente en el lote ${shrinkage.lotNumber}. Disponible: ${currentBatchStock}`);
        }

        const currentFilled = data.stockFilled || 0;
        if (currentFilled < shrinkage.quantity) {
          throw new Error(`Stock lleno insuficiente en el producto (alerta de desincronización). Disponible: ${currentFilled}`);
        }

        // 1. Actualizar Stock Lleno del Producto y del Lote
        const newFilled = currentFilled - shrinkage.quantity;
        transaction.update(productRef, {
          stockFilled: newFilled,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        transaction.update(batchRef, {
          currentStock: currentBatchStock - shrinkage.quantity,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 2. Guardar la Merma
        const shrinkageRef = adminDb.collection(SHRINKAGE_COLLECTION).doc();
        transaction.set(shrinkageRef, {
          ...shrinkage,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 3. Registrar Kardex OUT/FILLED (Delta Real)
        const kardexOutRef = adminDb.collection(KARDEX_COLLECTION).doc();
        transaction.set(kardexOutRef, {
          productId: shrinkage.productId,
          type: "OUT",
          phase: "FILLED",
          quantity: shrinkage.quantity,
          lotNumber: shrinkage.lotNumber,
          referenceId: shrinkageRef.id,
          referenceType: "SHRINKAGE",
          previousStock: currentFilled,
          newStock: newFilled,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          movementType: "LOSS",
          delta: -shrinkage.quantity,
          resultingBalance: newFilled,
          userId: shrinkage.managerId || "SYSTEM",
        });

        // 4. Si es reciclable, registrar Kardex IN/EMPTY y actualizar stockEmpty
        if (shrinkage.isRecyclable) {
          const currentEmpty = data.stockEmpty || 0;
          const newEmpty = currentEmpty + shrinkage.quantity;
          
          transaction.update(productRef, {
            stockEmpty: newEmpty
          });

          const kardexInRef = adminDb.collection(KARDEX_COLLECTION).doc();
          transaction.set(kardexInRef, {
            productId: shrinkage.productId,
            type: "IN",
            phase: "EMPTY",
            quantity: shrinkage.quantity,
            referenceId: shrinkageRef.id,
            referenceType: "SHRINKAGE",
            previousStock: currentEmpty,
            newStock: newEmpty,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            movementType: "RETURN",
            delta: shrinkage.quantity,
            resultingBalance: newEmpty,
            userId: shrinkage.managerId || "SYSTEM",
          });
        }
      }
    });
    try {
      revalidateTag("products", "max");
    } catch (error) {
      // Ignorar si se ejecuta fuera de un contexto de servidor Next.js (como scripts de terminal)
    }
  },

  // ----------------------------------------------------------------
  // 5. CONSULTA DE KARDEX (Auditoría)
  // ----------------------------------------------------------------
  async getKardexByProduct(productId: string): Promise<KardexLog[]> {
    const snapshot = await adminDb
      .collection(KARDEX_COLLECTION)
      .where("productId", "==", productId)
      .orderBy("createdAt", "desc")
      .limit(100) // Traemos los últimos 100 movimientos por rendimiento
      .get();

    return snapshot.docs.map((doc) =>
      serializeFirestoreData({
        id: doc.id,
        ...doc.data(),
      }),
    );
  },

  async updateProduct(id: string, data: Partial<Product>): Promise<void> {
    await adminDb
      .collection(PRODUCTS_COLLECTION)
      .doc(id)
      .update({
        ...data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    revalidateTag("products", "max");
  },

  async toggleProductStatus(id: string, isActive: boolean): Promise<void> {
    await adminDb.collection(PRODUCTS_COLLECTION).doc(id).update({
      isActive,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    revalidateTag("products", "max");
  },

  async listKardexPaginated(options: {
    productId: string;
    pageSize: number;
    cursor?: string;
  }) {
    if (!options.productId) {
      throw new Error("El ID del producto es obligatorio para consultar el Kardex.");
    }

    const query = adminDb
      .collection(KARDEX_COLLECTION)
      .where("productId", "==", options.productId)
      .orderBy("createdAt", "desc")
      .orderBy("__name__", "desc");

    const projectedQuery = query.select(
      "productId",
      "type",
      "phase",
      "quantity",
      "previousStock",
      "newStock",
      "createdAt",
      "referenceId",
      "referenceType",
      "movementType",
      "delta",
      "resultingBalance",
      "userId"
    );

    return await paginate<any>(
      projectedQuery,
      options,
      ["createdAt", "id"],
      (doc) => {
        const data = doc.data();
        return serializeFirestoreData({
          id: doc.id,
          ...data,
        });
      }
    );
  },

  async getActiveBatches(): Promise<ProductionBatch[]> {
    const snapshot = await adminDb
      .collection(PRODUCTION_COLLECTION)
      .where("currentStock", ">", 0)
      .get();
    return snapshot.docs.map((doc) =>
      serializeFirestoreData({
        id: doc.id,
        ...doc.data(),
      })
    ) as ProductionBatch[];
  },
};
