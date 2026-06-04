export interface ICorrelativeService {
  getNextSequence(serie: string): Promise<string>;
}
