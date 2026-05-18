// src/app/actions/sunatActions.ts
"use server";

import { adminDb, adminStorage } from "@/services/firebase/admin";
import { buildInvoiceXml } from "@/services/sunat/xmlGenerator";
import { signXml } from "@/services/sunat/xmlSigner";
import { sendInvoiceToSunat } from "@/services/sunat/apiSunat";
import { getNextSequence } from "@/services/sunat/correlativeService";
import JSZip from "jszip";
import { buildVoidXml } from "@/services/sunat/xmlVoidGenerator";
import { buildDespatchXml } from "@/services/sunat/xmlDespatchGenerator";
import {
  getGreTicketStatusRest,
  sendGuiaToSunatRest,
} from "@/services/sunat/apiSunatRest";

/**
 * EMISIÓN: Genera una Factura o Boleta consolidando uno o varios pedidos (sales)
 */

export async function emitirComprobanteAction(
  saleIds: string[] | string,
  tipoDocumento: "01" | "03",
) {
  try {
    const RUC_EMPRESA = process.env.SUNAT_RUC || "20612769151";
    let customerId = "";

    let totalAmount = 0;
    const consolidatedItems: any[] = [];
    const guiasAsociadas: string[] = [];

    // Si nos envían un solo ID como string, lo envolvemos en un Array para estandarizar el flujo
    const idsToProcess = Array.isArray(saleIds) ? saleIds : [saleIds];

    // 1. ITERAR Y CONSOLIDAR TODAS LAS VENTAS SELECCIONADAS
    for (const saleId of idsToProcess) {
      const saleDoc = await adminDb.collection("sales").doc(saleId).get();
      if (!saleDoc.exists) throw new Error(`Venta ${saleId} no encontrada`);
      const saleData = saleDoc.data() as any;

      // Validar que todas las ventas pertenezcan al mismo cliente
      if (!customerId) customerId = saleData.customerId;
      if (customerId !== saleData.customerId) {
        throw new Error("No puedes consolidar ventas de diferentes clientes.");
      }

      totalAmount += saleData.totalAmount;

      // Agrupar productos de los tickets
      for (const item of saleData.items) {
        const productDoc = await adminDb
          .collection("products")
          .doc(item.productId)
          .get();
        const productData = productDoc.data();

        consolidatedItems.push({
          ...item,
          // Alimenta la descripción real para el generador UBL 2.1
          description: productData?.name || "Bidón de Agua Moalv",
        });
      }

      // 2. BUSCAR SI ESTA VENTA TIENE UNA GUÍA DE REMISIÓN (GRE) APROBADA
      const greSnapshot = await adminDb
        .collection("sunatDocuments")
        .where("saleId", "==", saleId)
        .where("type", "==", "09")
        .where("status", "==", "ACCEPTED")
        .get();

      if (!greSnapshot.empty) {
        guiasAsociadas.push(greSnapshot.docs[0].id);
      }
    }

    // 3. OBTENER DATOS DEL CLIENTE
    const customerDoc = await adminDb
      .collection("customers")
      .doc(customerId)
      .get();
    if (!customerDoc.exists) throw new Error("Cliente no encontrado en el CRM");
    const customerData = customerDoc.data() as any;

    // 4. GENERAR CORRELATIVO ÚNICO DE SUNAT (Serie F001 o B001)
    const serie = tipoDocumento === "01" ? "F001" : "B001";
    const correlativo = await getNextSequence(serie);
    const documentId = `${serie}-${correlativo}`;
    const fileName = `${RUC_EMPRESA}-${tipoDocumento}-${documentId}`;

    // Estructurar la data exacta para el generador XML (UBL 2.0)
    const invoiceInfo = {
      documentId,
      documentType: tipoDocumento,
      totalAmount,
      customerDocument: customerData.documentNumber,
      customerName: customerData.name || customerData.fullName,
      items: consolidatedItems,
      guiasAsociadas,
      issueDate: new Date().toISOString().split("T")[0],
    };

    // 5. GENERAR XML, FIRMAR Y ENVIAR A SUNAT (PROCESO SOAP)
    const rawXml = buildInvoiceXml(invoiceInfo);
    const signedXml = signXml(rawXml); // Firma digital
    // const signedXml = rawXml; // ← Envía sin firma temporalmente

    // El método sendInvoiceToSunat envía a SUNAT/OSE y retorna el CDR en Base64 si fue aprobado
    const cdrZipBase64 = await sendInvoiceToSunat(fileName, signedXml);

    // 6. DEFINIR LAS RUTAS EXACTAS DE ALMACENAMIENTO EN STORAGE
    const xmlPath = `sunat/xml/facturas/${fileName}.xml`;
    const cdrPath = `sunat/cdr/facturas/R-${fileName}.zip`;
    const pdfPath = `sunat/pdf/facturas/${fileName}.pdf`; // Ruta donde se guardará tu PDF

    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    if (!bucketName)
      throw new Error("Falta definir FIREBASE_STORAGE_BUCKET en el .env");
    const bucket = adminStorage.bucket(bucketName);

    // Guardar el XML firmado en Firebase Storage
    await bucket
      .file(xmlPath)
      .save(signedXml, { contentType: "application/xml" });

    // Guardar el CDR devuelto por SUNAT en Firebase Storage
    if (cdrZipBase64) {
      const cdrBuffer = Buffer.from(cdrZipBase64, "base64");
      await bucket
        .file(cdrPath)
        .save(cdrBuffer, { contentType: "application/zip" });
    }

    // [AQUÍ] En el futuro cercano, llamarás a tu función generadora de PDF:
    // await generateInvoicePdf(invoiceInfo, pdfPath);

    // 7. REGISTRAR COMPROBANTE TRIBUTARIO EN FIRESTORE
    await adminDb.collection("sunatDocuments").doc(documentId).set({
      id: documentId,
      saleIds: idsToProcess, // Almacenamos el array para saber qué ventas cubre este documento
      type: tipoDocumento,
      status: "ACCEPTED",
      xmlUrl: xmlPath,
      cdrUrl: cdrPath,
      pdfUrl: pdfPath, // Guardamos la referencia para el PDF
      createdAt: new Date(),
    });

    // 8. ACTUALIZACIÓN MASIVA DE LAS VENTAS AFECTADAS (BATCH ATÓMICO)
    const batch = adminDb.batch();
    for (const saleId of idsToProcess) {
      const saleRef = adminDb.collection("sales").doc(saleId);
      batch.update(saleRef, {
        isBilled: true,
        sunatDocumentId: documentId,
        updatedAt: new Date(),
      });
    }
    await batch.commit();

    // 9. RETORNAR LAS DIRECCIONES DE DESCARGA DIRECTAS PARA LA UI
    return {
      success: true,
      documentId,
      xmlUrl: xmlPath,
      cdrUrl: cdrPath,
      pdfUrl: pdfPath,
    };
  } catch (error: any) {
    console.error("Error en el proceso de facturación:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ANULACIÓN PASO 1: Genera el XML de Baja, lo firma y obtiene el TICKET de SUNAT
 */
export async function anularComprobanteAction(
  documentId: string,
  motivoAnulacion: string,
) {
  try {
    if (!motivoAnulacion || motivoAnulacion.trim().length < 3) {
      throw new Error("Debe proporcionar un motivo válido para la anulación.");
    }

    // 1. Buscar el documento en Firestore
    const sunatDocRef = adminDb.collection("sunatDocuments").doc(documentId);
    const sunatDoc = await sunatDocRef.get();
    if (!sunatDoc.exists)
      throw new Error("El comprobante electrónico no existe.");
    const sunatData = sunatDoc.data() as any;

    if (sunatData.status === "VOIDED" || sunatData.status === "VOID_PENDING") {
      throw new Error(
        "Este comprobante ya está anulado o en proceso de anulación.",
      );
    }

    // 2. Preparar identificadores
    const RUC_EMPRESA = process.env.SUNAT_RUC || "20612769151";
    const fechaHoy = new Date().toISOString().split("T")[0].replace(/-/g, "");

    const rawCorrelativo = await getNextSequence(`RA-${fechaHoy}`);

    // SOLUCIÓN: Convertimos a Number para quitar los ceros a la izquierda (Ej: "000001" -> "1")
    // SUNAT exige que el correlativo de bajas sea máximo de 5 dígitos
    const correlativoBaja = Number(rawCorrelativo).toString();

    const identifierBaja = `RA-${fechaHoy}-${correlativoBaja}`;
    const fileNameBaja = `${RUC_EMPRESA}-${identifierBaja}`;

    // 3. Formatear la data para el Generador XML de Bajas
    const bajaInfo = {
      identifierBaja: identifierBaja,
      originalDocumentId: documentId,
      originalDocumentType: sunatData.type,
      originalIssueDate: sunatData.issueDate,
      voidIssueDate: new Date().toISOString().split("T")[0],
      voidReason: motivoAnulacion,
    };

    // 4. Generar y Firmar XML de Baja
    const rawXml = buildVoidXml(bajaInfo);
    const signedXml = signXml(rawXml);

    // 5. Enviar a SUNAT por el túnel de resúmenes (Nos devuelve un TICKET)
    const ticket = await sendSummaryToSunat(fileNameBaja, signedXml);

    // 6. Guardar el XML firmado en Storage (Buenas prácticas)
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    if (!bucketName) throw new Error("Falta FIREBASE_STORAGE_BUCKET");
    const bucket = adminStorage.bucket(bucketName);
    const xmlPath = `sunat/xml/bajas/${fileNameBaja}.xml`;
    await bucket
      .file(xmlPath)
      .save(signedXml, { contentType: "application/xml" });

    // 7. Actualizar Firestore marcando como PENDIENTE y guardando el Ticket
    await sunatDocRef.update({
      status: "VOID_PENDING",
      voidReason: motivoAnulacion,
      voidIdentifier: identifierBaja,
      voidTicket: ticket, // ¡Vital guardar el ticket para consultarlo después!
      voidXmlUrl: xmlPath,
      voidedAt: new Date(),
    });

    return {
      success: true,
      message: "Baja enviada a SUNAT. Ticket generado.",
      ticket: ticket,
    };
  } catch (error: any) {
    console.error("Error en proceso de anulación:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ANULACIÓN PASO 2: Consulta a SUNAT usando el Ticket para confirmar si la baja procedió
 */
export async function consultarTicketBajaAction(documentId: string) {
  try {
    const sunatDocRef = adminDb.collection("sunatDocuments").doc(documentId);
    const sunatDoc = await sunatDocRef.get();
    if (!sunatDoc.exists) throw new Error("El documento no existe.");
    const sunatData = sunatDoc.data() as any;

    if (!sunatData.voidTicket) {
      throw new Error("Este documento no tiene un ticket de baja asociado.");
    }

    // Consultamos a SUNAT
    const response = await getTicketStatus(sunatData.voidTicket);

    if (response.status === "98") {
      return {
        success: true,
        status: "PENDING",
        message: "SUNAT aún está procesando la baja.",
      };
    }

    if (response.status === "99") {
      await sunatDocRef.update({ status: "VOID_REJECTED" });
      throw new Error("SUNAT rechazó la anulación. Revisa los datos enviados.");
    }

    if (response.status === "0") {
      // SUNAT ACEPTÓ LA BAJA
      let cdrPath = null;

      // Si nos devolvió el ZIP con la constancia (CDR), lo guardamos
      if (response.cdrZipBase64) {
        const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
        const bucket = adminStorage.bucket(bucketName!);
        cdrPath = `sunat/cdr/bajas/R-${sunatData.voidIdentifier}.zip`;
        const cdrBuffer = Buffer.from(response.cdrZipBase64, "base64");
        await bucket
          .file(cdrPath)
          .save(cdrBuffer, { contentType: "application/zip" });
      }

      // Actualizamos el documento a estado ANULADO
      await sunatDocRef.update({
        status: "VOIDED",
        voidCdrUrl: cdrPath,
      });

      // (Opcional) Liberamos los pedidos para que puedan volver a facturarse
      if (sunatData.saleIds && sunatData.saleIds.length > 0) {
        const batch = adminDb.batch();
        for (const saleId of sunatData.saleIds) {
          const saleRef = adminDb.collection("sales").doc(saleId);
          batch.update(saleRef, {
            isBilled: false,
            sunatDocumentId: null, // Quitamos la referencia de la factura anulada
          });
        }
        await batch.commit();
      }

      return {
        success: true,
        status: "ACCEPTED",
        message: "La baja fue aprobada por SUNAT con éxito.",
      };
    }

    throw new Error(`Estado desconocido recibido de SUNAT: ${response.status}`);
  } catch (error: any) {
    console.error("Error consultando ticket:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ENVÍO ASÍNCRONO: Envía resúmenes y bajas a SUNAT y retorna un número de TICKET
 */
export async function sendSummaryToSunat(fileName: string, signedXml: string) {
  const ruc = process.env.SUNAT_RUC;
  const user = process.env.SUNAT_USER_SOL;
  const password = process.env.SUNAT_PASS_SOL;

  const zip = new JSZip();
  zip.file(`${fileName}.xml`, signedXml);
  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  const zipBase64 = zipBuffer.toString("base64");

  const soapEnvelope = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.sunat.gob.pe" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
      <soapenv:Header>
        <wsse:Security>
          <wsse:UsernameToken>
            <wsse:Username>${ruc}${user}</wsse:Username>
            <wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${password}</wsse:Password>
          </wsse:UsernameToken>
        </wsse:Security>
      </soapenv:Header>
      <soapenv:Body>
        <ser:sendSummary>
          <fileName>${fileName}.zip</fileName>
          <contentFile>${zipBase64}</contentFile>
        </ser:sendSummary>
      </soapenv:Body>
    </soapenv:Envelope>
  `;

  const endpoint =
    "https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml;charset=UTF-8",
      SOAPAction: "urn:sendSummary",
    },
    body: soapEnvelope.trim(),
  });

  const responseText = await response.text();

  if (!response.ok || responseText.includes("faultcode")) {
    const faultCode = responseText
      .match(/<faultcode[^>]*>(.*?)<\/faultcode>/)?.[1]
      ?.replace("soap-env:", "");
    const faultString = responseText.match(
      /<faultstring[^>]*>(.*?)<\/faultstring>/,
    )?.[1];
    throw new Error(
      `Rechazo de SUNAT al enviar baja: ${faultCode} - ${faultString}`,
    );
  }

  // Extraer el TICKET
  const ticketMatch = responseText.match(/<ticket>(.*?)<\/ticket>/);
  if (!ticketMatch || !ticketMatch[1]) {
    throw new Error("SUNAT no devolvió un número de ticket para la baja.");
  }

  return ticketMatch[1];
}

/**
 * CONSULTA DE TICKET: Pregunta a SUNAT el estado de una baja usando su número de ticket
 */
export async function getTicketStatus(ticket: string) {
  const ruc = process.env.SUNAT_RUC;
  const user = process.env.SUNAT_USER_SOL;
  const password = process.env.SUNAT_PASS_SOL;

  const soapEnvelope = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.sunat.gob.pe" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
      <soapenv:Header>
        <wsse:Security>
          <wsse:UsernameToken>
            <wsse:Username>${ruc}${user}</wsse:Username>
            <wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${password}</wsse:Password>
          </wsse:UsernameToken>
        </wsse:Security>
      </soapenv:Header>
      <soapenv:Body>
        <ser:getStatus>
          <ticket>${ticket}</ticket>
        </ser:getStatus>
      </soapenv:Body>
    </soapenv:Envelope>
  `;

  const endpoint =
    "https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml;charset=UTF-8",
      SOAPAction: "urn:getStatus",
    },
    body: soapEnvelope.trim(),
  });

  const responseText = await response.text();

  if (!response.ok || responseText.includes("faultcode")) {
    throw new Error("Error consultando el ticket en SUNAT.");
  }

  // SUNAT devuelve un statusCode: 0 (Aceptado), 98 (En proceso), 99 (Rechazado)
  const statusCodeMatch = responseText.match(/<statusCode>(.*?)<\/statusCode>/);
  const status = statusCodeMatch ? statusCodeMatch[1] : null;

  // Si fue aceptado (0) o rechazado con error (99), nos devuelve un ZIP con el CDR
  const contentMatch = responseText.match(/<content>(.*?)<\/content>/);
  const cdrZipBase64 = contentMatch ? contentMatch[1] : null;

  return {
    status, // "0", "98", o "99"
    cdrZipBase64,
  };
}

export async function emitirGuiaRemisionAction(
  saleId: string,
  truckId: string,
  driverId: string,
  locationIndex: number = 0,
) {
  try {
    const RUC_EMPRESA = process.env.SUNAT_RUC || "20612769151";

    // 1. Obtener la Venta, Cliente, Camión y Conductor desde Firestore
    const saleDoc = await adminDb.collection("sales").doc(saleId).get();
    if (!saleDoc.exists) throw new Error("Venta no encontrada");
    const saleData = saleDoc.data() as any;

    const customerDoc = await adminDb
      .collection("customers")
      .doc(saleData.customerId)
      .get();
    const customerData = customerDoc.data() as any;
    const location =
      customerData.locations[locationIndex] || customerData.locations[0];

    const truckDoc = await adminDb.collection("trucks").doc(truckId).get();
    const truckData = truckDoc.data() as any;

    const driverDoc = await adminDb.collection("users").doc(driverId).get();
    const driverData = driverDoc.data() as any;

    // Validaciones estrictas de GRE
    if (!location.ubigeo || location.ubigeo.length !== 6)
      throw new Error("El cliente no tiene un Ubigeo válido.");
    if (!driverData.documentNumber)
      throw new Error("El conductor no tiene un DNI registrado.");
    if (!truckData.plateNumber)
      throw new Error("El camión no tiene una placa registrada.");

    // 2. Calcular Peso Total Estimado
    const pesoTotalKilos = saleData.items.reduce((acc: number, item: any) => {
      return acc + item.quantity * 21; // 21 kilos aprox por bidón
    }, 0);

    // 3. Generar el Correlativo de la Guía (Serie T001)
    const serie = "T001";
    const correlativo = await getNextSequence(serie);
    const documentId = `${serie}-${correlativo}`;
    const fileName = `${RUC_EMPRESA}-09-${documentId}`;

    const issueDate = new Date();

    // 4. Estructurar la Data para el Generador XML
    const guiaInfo = {
      documentId: documentId,
      issueDate: issueDate.toISOString().split("T")[0],
      issueTime: issueDate.toTimeString().split(" ")[0],
      customerDocument: customerData.documentNumber,
      customerName: customerData.name || customerData.fullName,
      motivoTraslado: "01", // 01 = Venta
      pesoTotalKilos: pesoTotalKilos,
      driverDni: driverData.documentNumber,
      vehiclePlate: truckData.plateNumber,
      ubigeoLlegada: location.ubigeo,
      direccionLlegada: location.address,
      items: saleData.items.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        description: item.description || "BIDON DE AGUA",
      })),
    };

    // 5. Generar y Firmar XML
    const rawXml = buildDespatchXml(guiaInfo);
    const signedXml = signXml(rawXml); // Reutilizamos tu función de firma de facturas

    // 6. ENVIAR A SUNAT MEDIANTE API REST
    const ticket = await sendGuiaToSunatRest(fileName, signedXml);

    // 7. Guardar el XML en Storage
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    const bucket = adminStorage.bucket(bucketName!);
    const xmlPath = `sunat/xml/guias/${fileName}.xml`;
    await bucket
      .file(xmlPath)
      .save(signedXml, { contentType: "application/xml" });

    // 8. Registrar la Guía en Firestore en estado PENDIENTE
    await adminDb.collection("sunatDocuments").doc(documentId).set({
      id: documentId,
      saleId: saleId,
      type: "09", // 09 = Guía de remisión
      status: "VOID_PENDING", // Usamos pending porque la API REST es asíncrona
      greTicket: ticket,
      xmlUrl: xmlPath,
      issueDate: guiaInfo.issueDate,
      createdAt: new Date(),
    });

    return { success: true, documentId, ticket };
  } catch (error: any) {
    console.error("Error emitiendo Guía de Remisión:", error);
    return { success: false, error: error.message };
  }
}

export async function consultarTicketGreAction(documentId: string) {
  try {
    const sunatDocRef = adminDb.collection("sunatDocuments").doc(documentId);
    const sunatDoc = await sunatDocRef.get();
    if (!sunatDoc.exists) throw new Error("Documento no encontrado");
    const sunatData = sunatDoc.data() as any;

    if (!sunatData.greTicket) throw new Error("No hay un ticket GRE asociado.");

    const response = await getGreTicketStatusRest(sunatData.greTicket);

    if (response.status === "98") {
      return {
        success: true,
        status: "PENDING",
        message: "SUNAT está procesando la guía...",
      };
    }

    if (response.status === "99") {
      await sunatDocRef.update({ status: "REJECTED" });
      throw new Error(
        `SUNAT rechazó la Guía: ${response.error || "Error desconocido"}`,
      );
    }

    if (response.status === "0") {
      let cdrPath = null;
      if (response.cdrZipBase64) {
        const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
        const bucket = adminStorage.bucket(bucketName!);
        cdrPath = `sunat/cdr/guias/R-${documentId}.zip`;
        const cdrBuffer = Buffer.from(response.cdrZipBase64, "base64");
        await bucket
          .file(cdrPath)
          .save(cdrBuffer, { contentType: "application/zip" });
      }

      await sunatDocRef.update({
        status: "ACCEPTED",
        cdrUrl: cdrPath,
      });

      return {
        success: true,
        status: "ACCEPTED",
        message: "Guía Aceptada por SUNAT",
      };
    }

    throw new Error(`Estado desconocido: ${response.status}`);
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
