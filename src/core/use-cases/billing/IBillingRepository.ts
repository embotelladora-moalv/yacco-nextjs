export interface IBillingRepository {
  saveDocument(doc: any): Promise<void>;
  findApprovedGreBySaleId(saleId: string): Promise<string | null>;
}
