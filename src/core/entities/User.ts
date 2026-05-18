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
  licenseNumber?: string; // <-- Nuevo campo para número de licencia (opcional)
  documentNumber?: string; // <-- Nuevo campo para número de licencia (opcional)

  // Para transportistas, vinculamos opcionalmente a un camión
  truckId?: string;

  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}
