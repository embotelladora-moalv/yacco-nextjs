export interface ProductionBatch {
  id: string;
  productId: string;
  quantityProduced: number;
  productionDate: Date;
  expirationDate?: Date;
  managerId: string; // ID del encargado responsable

  // Requisito: Maquila
  isTollManufacturing: boolean;
  brandId?: string; // Si es maquila, ¿para qué marca?

  notes?: string;
  createdAt: Date;
}

export interface ShrinkageLog {
  id: string;
  productId: string;
  quantity: number;
  reasonId: string; // Motivo gestionable (ej: "Se rompió en planta")
  managerId: string;
  createdAt: Date;
}

export interface KardexLog {
  id: string;
  productId: string;
  type: "IN" | "OUT";
  quantity: number;
  lotNumber?: string;
  referenceId: string; // ID del ProductionBatch, ShrinkageLog o Sale
  referenceType: "PRODUCTION" | "SHRINKAGE" | "SALE" | "RETURN" | "POST_LIQUIDATION_RETURN";
  previousStock: number;
  newStock: number;
  createdAt: Date;
}
