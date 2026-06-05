// ---------------------------------------------------------
// 1. ENTIDAD MAESTRA: PRODUCTO
// Fusión de las especificaciones físicas y la realidad comercial
// ---------------------------------------------------------
export interface Product {
  id: string;
  name: string;
  sku: string;
  operationalCategory: "FULL_PRODUCT" | "EMPTY_CONTAINER" | "ACCESSORY";
  category?: string; // campo legacy del schema anterior
  packagingType: string;

  // NUEVOS CAMPOS DE MAQUILA
  isMaquila: boolean;
  brandName?: string; // Nombre de la marca externa (Ej: "Agua María")

  volumeCapacity: number;
  unitOfMeasure: "L" | "ml" | "Gal" | "Oz";
  hasTap?: boolean | null;
  isReturnableContainer: boolean;

  priceRefill: number;
  priceFull: number;
  priceEmpty: number;

  stockFilled: number;
  stockEmpty: number;

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------
// 2. ENTIDADES DE PRODUCCIÓN (Manteniendo tu excelente estructura)
// ---------------------------------------------------------
export interface ProductionBatch {
  id: string;
  lotNumber: string; // Será formato L-YYYYMMDD (Ej: L-20260510)
  productId: string;
  quantityProduced: number; // El total histórico producido ese día
  currentStock: number; // <-- NUEVO: Cuántos quedan de este lote en almacén
  productionDate: Date;
  expirationDate?: Date; // Vencimiento del lote (opcional en creación, FEFO)
  managerId: string;
  isTollManufacturing: boolean;
  brandName?: string; // Nombre de la marca externa (Ej: "Agua María")
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShrinkageLog {
  id: string;
  productId: string;
  quantity: number;
  phase: "EMPTY" | "FILLED"; // ¿Se rompió el vacío al lavarlo o el lleno en ruta?
  reasonId: string; // Motivo gestionable (ej: "Caño roto")
  managerId: string;
  createdAt: Date;
}

// ---------------------------------------------------------
// 3. ENTIDAD DE AUDITORÍA: KARDEX LOG
// El historial inmutable (Nadie puede editar esto directamente)
// ---------------------------------------------------------
export interface KardexLog {
  id: string;
  productId: string;
  type: "IN" | "OUT";
  phase: "EMPTY" | "FILLED"; // ¿Se movió stock vacío o stock lleno?
  quantity: number;
  lotNumber?: string; // Lote asociado al movimiento

  // Trazabilidad
  referenceId: string; // El ID del Lote, de la Merma, de la Venta o de la Compra
  referenceType:
    | "PRODUCTION"
    | "SHRINKAGE"
    | "SALE"
    | "RETURN"
    | "PURCHASE"
    | "DISPATCH"
    | "ROUTE_RETURN"
    | "EMPTY_RETURN_LIQUIDATION"
    | "EMPTY_RETURN_PITSTOP"
    | "DISPATCH_RELOAD"
    | "DISPATCH_RELOAD_RETURN";

  previousStock: number;
  newStock: number;
  createdAt: Date;

  // Nuevos campos avanzados (Inglés)
  movementType?: "SALE" | "DISPATCH" | "PRODUCTION" | "LOSS" | "ADJUSTMENT" | "PURCHASE" | "RETURN";
  delta?: number;
  resultingBalance?: number;
  userId?: string;
}
