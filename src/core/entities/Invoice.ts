export type InvoiceType =
  | "BOLETA"
  | "FACTURA"
  | "GUIA_REMISION"
  | "NOTA_CREDITO";
export type InvoiceStatus = "DRAFT" | "ISSUED" | "CANCELLED";

export interface Invoice {
  id: string;
  invoiceNumber: string; // Ej: F001-000001 (Correlativo)
  type: InvoiceType;

  customerId: string;
  orderIds: string[]; // IDs de los pedidos que cubre esta factura

  totalAmount: number; // Suma de los pedidos

  status: InvoiceStatus;

  // Archivos que devolvería el facturador electrónico (Ej: Nubefact, Sunat API)
  pdfUrl?: string;
  xmlUrl?: string;

  issueDate: Date;
  createdAt: Date;
  updatedAt: Date;
}
