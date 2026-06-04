export interface Truck {
  id: string;
  plateNumber: string; // Placa (ej: ABC-123)
  alias: string; // Nombre común (ej: Fuso Blanco)
  capacity: number; // En unidades de bidones de 20L
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
