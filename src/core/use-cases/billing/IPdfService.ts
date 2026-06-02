export interface IPdfService {
  generateInvoicePdf(invoiceInfo: any, signedXml: string): Promise<Buffer>;
}
