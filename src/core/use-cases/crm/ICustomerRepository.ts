import { Customer } from "../../entities/CRM";

export interface ICustomerRepository {
  getById(id: string): Promise<Customer | null>;
}
