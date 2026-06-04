import { setGlobalOptions } from "firebase-functions/v2";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

// 👇 AQUÍ IMPORTARÍAS TUS SCRIPTS REALES DE SUNAT (Que debes copiar a la carpeta de functions)
// import { generateInvoiceXml } from "./sunat/xmlGenerator";
// import { signXml } from "./sunat/xmlSigner";
// import { sendToSunatAPI } from "./sunat/apiSunat";

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({ maxInstances: 10 });

/**
 * FUNCIÓN AUXILIAR: Genera un correlativo secuencial seguro (Ej: 00000015)
 * Usa transacciones para evitar duplicados si 2 choferes facturan al mismo milisegundo.
 */
async function getNextCorrelative(serie: string): Promise<string> {
  const counterRef = db.collection("sunat_counters").doc(serie);

  return await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(counterRef);
    let nextVal = 1;

    if (doc.exists) {
      nextVal = (doc.data()?.current || 0) + 1;
      transaction.update(counterRef, { current: nextVal });
    } else {
      transaction.set(counterRef, { current: nextVal });
    }

    // Formatea el número a 8 dígitos: "00000001"
    return nextVal.toString().padStart(8, "0");
  });
}

/**
 * WORKER DE SUNAT: Se dispara al crear un doc en "sunatQueue"
 */
export const processSunatQueue = onDocumentCreated(
  "sunatQueue/{taskId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const task = snapshot.data();
    const taskId = event.params.taskId;

    if (task.status !== "PENDING") return;

    logger.info(`Iniciando procesamiento de la venta: ${task.saleId}`);

    try {
      // 1. Bloqueamos la tarea
      await snapshot.ref.update({
        status: "PROCESSING",
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 2. Traemos la Venta y el Cliente
      const saleRef = db.collection("sales").doc(task.saleId);
      const saleSnap = await saleRef.get();

      if (!saleSnap.exists) {
        throw new Error(`La venta ${task.saleId} no existe.`);
      }

      const saleData = saleSnap.data()!;

      const customerSnap = await db
        .collection("customers")
        .doc(saleData.customerId)
        .get();
      const customerData = customerSnap.data();

      if (!customerData) {
        throw new Error(`El cliente ${saleData.customerId} no existe.`);
      }

      let generatedSunatId = "";

      // ====================================================================
      // 3. MAGIA SUNAT: EMISIÓN DE FACTURA O BOLETA
      // ====================================================================
      if (task.requiresBilling) {
        // Lógica de negocio: RUC = Factura (01), DNI/Otros = Boleta (03)
        const isFactura = customerData.documentType === "RUC";
        const tipoComprobante = isFactura ? "01" : "03";
        const serie = isFactura ? "F001" : "B001"; // Puedes cambiar las series por sucursal luego

        // Obtener número correlativo exacto
        const numero = await getNextCorrelative(serie);
        generatedSunatId = `${serie}-${numero}`;

        logger.info(
          `Generando comprobante: ${generatedSunatId} (Tipo: ${tipoComprobante})`,
        );

        // ---> AQUÍ REEMPLAZAS CON TUS FUNCIONES REALES <---
        // const xmlBase64 = generateInvoiceXml(saleData, customerData, generatedSunatId);
        // const signedXml = signXml(xmlBase64, process.env.CERT_PASSWORD);
        // const sunatResponse = await sendToSunatAPI(signedXml, tipoComprobante);
        //
        // if (!sunatResponse.success) throw new Error(sunatResponse.error);

        // Simulación temporal para evitar errores de compilación:
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      // ====================================================================
      // 4. MAGIA SUNAT: EMISIÓN DE GUÍA DE REMISIÓN ELECTRÓNICA (GRE)
      // ====================================================================
      let generatedGuideId = "";
      if (task.requiresGuide) {
        const serieGuia = "T001";
        const numeroGuia = await getNextCorrelative(serieGuia);
        generatedGuideId = `${serieGuia}-${numeroGuia}`;

        logger.info(`Generando GRE: ${generatedGuideId}`);

        // ---> AQUÍ LLAMARÍAS AL GENERADOR DE GUÍAS UBL 2.1 <---
        // const guideXml = generateGuideXml(saleData, customerData, generatedGuideId);
        // ... misma lógica de firma y envío ...

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // ====================================================================
      // 5. ACTUALIZAR BASE DE DATOS Y FINALIZAR
      // ====================================================================

      const updateData: any = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (task.requiresBilling) {
        updateData.isBilled = true;
        updateData.sunatDocumentId = generatedSunatId;
      }

      if (task.requiresGuide) {
        updateData.hasGuide = true;
        updateData.guideDocumentId = generatedGuideId;
      }

      // Guardamos los IDs en la venta principal
      await saleRef.update(updateData);

      // Cerramos la tarea en la cola como ÉXITO
      await snapshot.ref.update({
        status: "SUCCESS",
        sunatDocumentId: generatedSunatId || null,
        guideDocumentId: generatedGuideId || null,
        finishedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info(`Operación SUNAT completada para venta ${task.saleId}`);
    } catch (error: any) {
      logger.error(`Error procesando la tarea ${taskId} de SUNAT:`, error);

      await snapshot.ref.update({
        status: "ERROR",
        errorMsg: error.message || "Error desconocido en SUNAT",
        finishedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  },
);
