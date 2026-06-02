import { Product } from "../../entities/Inventory";

export interface IProductRepository {
  getById(id: string): Promise<Product | null>;
}
