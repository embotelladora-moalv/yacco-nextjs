import { ISunatClient } from "@/core/use-cases/billing/ISunatClient";
import { sendInvoiceToSunat } from "@/services/sunat/apiSunat";

export class SunatSoapClient implements ISunatClient {
  async sendInvoice(fileName: string, signedXml: string): Promise<string | null> {
    return await sendInvoiceToSunat(fileName, signedXml);
  }
}
