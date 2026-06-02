import { IPdfService } from "@/core/use-cases/billing/IPdfService";
import { generateInvoicePdf } from "@/services/sunat/pdfGenerator";

export class SunatPdfService implements IPdfService {
  async generateInvoicePdf(invoiceInfo: any, signedXml: string): Promise<Buffer> {
    return await generateInvoicePdf(invoiceInfo, signedXml);
  }
}
