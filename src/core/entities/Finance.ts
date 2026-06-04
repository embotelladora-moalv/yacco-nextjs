// Archivo: src/core/entities/Finance.ts

export type MovementType = "INCOME" | "EXPENSE";
export type PaymentMethod = "CASH" | "TRANSFER" | "CARD" | "OTHER";

// 1. NUEVA ENTIDAD: Categoría Dinámica
export interface FinanceCategory {
  id: string;
  name: string; // Ej: "Combustible", "Llantas", "Venta de Dispensadores"
  type: MovementType; // Para saber si mostrarlo en ingresos o gastos
  isActive: boolean; // Por si en el futuro dejas de usar una categoría pero no quieres borrarla
  createdAt: Date;
}

// 2. ENTIDAD MOVIMIENTO ACTUALIZADA
export interface CashMovement {
  id: string;
  type: MovementType;
  categoryId: string; // AHORA SE GUARDA EL ID DINÁMICO, NO EL TEXTO FIJO
  categoryName: string; // Guardamos el nombre también como histórico por si editan la categoría
  amount: number;
  description: string;

  paymentMethod: PaymentMethod;

  // Vínculos Logísticos
  manifestId?: string;
  driverId?: string;

  date: Date;

  createdAt: Date;
  updatedAt: Date;
}
