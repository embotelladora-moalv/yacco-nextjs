"use server";

import { adminDb, adminStorage } from "@/services/firebase/admin";
import { buildInvoiceXml } from "@/services/sunat/xmlGenerator";
import { signXml } from "@/services/sunat/xmlSigner";
import { sendInvoiceToSunat } from "@/services/sunat/apiSunat";
import { getNextSequence } from "@/services/sunat/correlativeService";

export async function emitirComprobanteAction(
  saleId: string,
  documentType: "01" | "03",
) {
  try {
    const RUC_EMPRESA = process.env.SUNAT_RUC || "20612769151";

    // 1. Obtener datos de la Venta y del Cliente desde Firestore
    const saleDoc = await adminDb.collection("sales").doc(saleId).get();
    if (!saleDoc.exists) throw new Error("La venta no existe");
    const saleData = saleDoc.data() as any;

    const customerDoc = await adminDb
      .collection("customers")
      .doc(saleData.customerId)
      .get();
    if (!customerDoc.exists) throw new Error("El cliente no existe");
    const customerData = customerDoc.data() as any;

    // 2. Generar el Correlativo Seguro (Reemplaza la lógica anterior con esto)
    const serie = documentType === "01" ? "F001" : "B001";
    const correlativo = await getNextSequence(serie); // <--- Llama a la transacción
    const documentId = `${serie}-${correlativo}`;
    const fileName = `${RUC_EMPRESA}-${documentType}-${documentId}`;

    // 3. Formatear la data para el Generador XML
    const saleInfo = {
      documentId: documentId,
      documentType: documentType,
      issueDate: new Date().toISOString().split("T")[0], // Formato YYYY-MM-DD
      customerDocument: customerData.documentNumber || customerData.dni,
      customerName: customerData.fullName || customerData.businessName,
      items: saleData.items.map((item: any) => ({
        ...item,
        description: item.description || "Producto sin descripción", // <--- Valor por defecto
      })),
      // Nota: Asegúrate de que saleData.items tenga { quantity, unitPrice, description }
    };

    // 4. EL NÚCLEO: Generar, Firmar y Enviar
    const rawXml = buildInvoiceXml(saleInfo);
    const signedXml = signXml(rawXml);

    // sendInvoiceToSunat devuelve el CDR (Constancia de Recepción) en formato Base64 (ZIP)
    const cdrZipBase64 = await sendInvoiceToSunat(fileName, signedXml);

    // 5. Guardar los archivos en Firebase Storage
    const bucket = adminStorage.bucket();

    // Subir XML Firmado
    const xmlFile = bucket.file(`sunat/xml/${fileName}.xml`);
    await xmlFile.save(signedXml, { contentType: "application/xml" });
    const xmlUrl = await xmlFile.getSignedUrl({
      action: "read",
      expires: "01-01-2099",
    });

    // Subir CDR (ZIP)
    const cdrBuffer = Buffer.from(cdrZipBase64, "base64");
    const cdrFile = bucket.file(`sunat/cdr/R-${fileName}.zip`); // SUNAT prefija los CDR con "R-"
    await cdrFile.save(cdrBuffer, { contentType: "application/zip" });
    const cdrUrl = await cdrFile.getSignedUrl({
      action: "read",
      expires: "01-01-2099",
    });

    // 6. Registrar en Firestore en la colección "sunatDocuments"
    const sunatDocRef = adminDb.collection("sunatDocuments").doc(documentId);
    await sunatDocRef.set({
      id: documentId,
      saleId: saleId,
      customerId: customerData.id,
      type: documentType,
      status: "ACCEPTED", // Si sendInvoiceToSunat no lanzó error, fue aceptado
      issueDate: saleInfo.issueDate,
      totalAmount: saleData.totalAmount || 0,
      xmlUrl: xmlUrl[0],
      cdrUrl: cdrUrl[0],
      createdAt: new Date(),
    });

    // 7. Actualizar el ticket de venta para saber que ya fue facturado
    await saleDoc.ref.update({
      sunatDocumentId: documentId,
      isBilled: true,
    });

    return {
      success: true,
      documentId,
      xmlUrl: xmlUrl[0],
      cdrUrl: cdrUrl[0],
    };
  } catch (error: any) {
    console.error("Error emitiendo comprobante:", error);
    return { success: false, error: error.message };
  }
}
