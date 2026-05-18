import { setGlobalOptions } from "firebase-functions/v2";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({ maxInstances: 10 });

/**
 * WORKER DE SUNAT (Inteligente: Procesa 'sales' y 'orders')
 */
export const processSunatQueue = onDocumentCreated(
  "sunatQueue/{taskId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const task = snapshot.data();
    const taskId = event.params.taskId;

    if (task.status !== "PENDING") return;

    // AHORA USA REFERENCE_ID Y REFERENCE_TYPE PARA SABER SI ES PEDIDO O VENTA
    const refId = task.referenceId || task.saleId;
    const refType = task.referenceType || "SALE";

    logger.info(`Iniciando procesamiento de [${refType}]: ${refId}`);

    try {
      await snapshot.ref.update({
        status: "PROCESSING",
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 1. Apuntamos a la colección correcta (orders o sales)
      const collectionName = refType === "ORDER" ? "orders" : "sales";
      const docRef = db.collection(collectionName).doc(refId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) throw new Error(`El documento ${refId} no existe.`);
      const data = docSnap.data();

      // Variables para guardar los documentos generados
      let generatedSunatId = "";
      let generatedGuideId = "";

      // ------------------------------------------------------------------
      // 2. GENERACIÓN DE FACTURA / BOLETA (Si lo requiere)
      // ------------------------------------------------------------------
      if (task.requiresBilling) {
        // Simulamos la respuesta de SUNAT
        await new Promise((resolve) => setTimeout(resolve, 2000));
        generatedSunatId = `F001-${Math.floor(Math.random() * 1000)}`;
      }

      // ------------------------------------------------------------------
      // 3. GENERACIÓN DE GUÍA DE REMISIÓN (GRE)
      // ------------------------------------------------------------------
      if (task.requiresGuide) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        generatedGuideId = `T001-${Math.floor(Math.random() * 1000)}`;
      }

      // 4. Actualizamos el documento original (Pedido o Venta)
      const updateData: any = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (task.requiresBilling) {
        updateData.isBilled = true;
        updateData.sunatDocumentId = generatedSunatId;
      }
      if (task.requiresGuide) {
        updateData.hasGuide = true;
        updateData.guideDocumentId = generatedGuideId; // Se guarda la guía en el pedido
      }

      await docRef.update(updateData);

      // 5. Finalizamos la tarea en la cola
      await snapshot.ref.update({
        status: "SUCCESS",
        sunatDocumentId: generatedSunatId || null,
        guideDocumentId: generatedGuideId || null,
        finishedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info(`Operación completada con éxito para ${refId}`);
    } catch (error: any) {
      logger.error(`Error procesando la tarea ${taskId}:`, error);
      await snapshot.ref.update({
        status: "ERROR",
        errorMsg: error.message || "Error desconocido en SUNAT",
        finishedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  },
);
