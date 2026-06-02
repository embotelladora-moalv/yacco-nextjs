export interface ISunatClient {
  sendInvoice(fileName: string, signedXml: string): Promise<string | null>;
}
