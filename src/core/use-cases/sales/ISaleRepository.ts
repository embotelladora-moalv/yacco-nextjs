import { Sale } from "../../entities/CRM";

export interface ISaleRepository {
  getById(id: string): Promise<Sale | null>;
  updateBilledStatus(ids: string[], documentId: string): Promise<void>;
}
