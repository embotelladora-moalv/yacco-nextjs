import { ICorrelativeService } from "@/core/use-cases/billing/ICorrelativeService";
import { getNextSequence } from "@/services/sunat/correlativeService";

export class SunatCorrelativeService implements ICorrelativeService {
  async getNextSequence(serie: string): Promise<string> {
    return await getNextSequence(serie);
  }
}
