export type UserRole =
  | "ADMIN"
  | "PRODUCTION"
  | "SALES"
  | "DRIVER"
  | "ASSISTANT";

export interface User {
  id: string;
  name: string;
  email: string;
  roles: UserRole[]; // <-- CAMBIO CLAVE: Ahora es un array  phone?: string;

  // Para transportistas, vinculamos opcionalmente a un camión
  truckId?: string;

  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}
