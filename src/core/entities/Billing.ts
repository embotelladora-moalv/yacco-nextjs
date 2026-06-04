// src/core/entities/Billing.ts

export type SunatDocumentType = "01" | "03" | "09" | "07";
// 01: Factura, 03: Boleta, 09: Guía de Remisión, 07: Nota de Crédito

export type SunatDocumentStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "EXCEPTION";

export interface SunatDocument {
  id: string; // Ej: "F001-000123" (La serie y el correlativo)
  saleId: string; // El ID del ticket en tu colección "sales" (o vacío si es solo una Guía)
  customerId: string; // El ID del cliente (RUC o DNI)

  type: SunatDocumentType;
  status: SunatDocumentStatus;

  // Datos tributarios clave
  issueDate: string; // Fecha de emisión
  totalAmount: number; // Monto total de la factura/boleta

  // Archivos generados (Estas serán URLs de Firebase Storage)
  xmlUrl?: string; // El XML firmado que tú generaste
  cdrUrl?: string; // El ZIP con la constancia de respuesta de SUNAT
  pdfUrl?: string; // El ticket o A4 en PDF para el cliente

  // Datos de Respuesta de SUNAT
  sunatResponse?: {
    code: string; // Ej: "0" (Aceptado), "1033" (Rechazado por X motivo)
    description: string; // El mensaje literal de SUNAT
    digestValue?: string; // El "Hash" de la firma (Obligatorio imprimirlo en el PDF)
  };

  createdAt: any;
  updatedAt: any;
}
