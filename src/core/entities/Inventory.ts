// ---------------------------------------------------------
// 1. ENTIDAD MAESTRA: PRODUCTO
// Fusión de las especificaciones físicas y la realidad comercial
// ---------------------------------------------------------
export interface Product {
  id: string;
  name: string; // Ej: "Bidón 20L con Caño"
  sku: string; // Ej: "BID-20L-C"

  operationalCategory: "FULL_PRODUCT" | "EMPTY_CONTAINER" | "ACCESSORY";

  // Clasificación (Dynamic type from settings as discussed)
  packagingType: string;
  volumeCapacity: number;
  unitOfMeasure: "L" | "ml" | "Gal" | "Oz";
  hasTap: boolean;
  isReturnableContainer: boolean; // CRÍTICO: Activa la lógica de envases

  // --- FINANZAS Y PRECIOS ---
  // Si es descartable (Ej: Botella de 1L), solo usa priceFull.
  // Si es retornable (Ej: Bidón 20L), usa los 3.
  priceRefill: number; // Precio solo del líquido (exige que el cliente dé un envase vacío)
  priceFull: number; // Precio líquido + envase (no exige envase a cambio)
  priceEmpty: number; // Precio del envase vacío (para penalidad por pérdida o venta directa)

  // --- KARDEX BIFÁSICO ---
  stockFilled: number; // Bidones listos para vender
  stockEmpty: number; // Bidones vacíos listos para lavar/producción

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------
// 2. ENTIDADES DE PRODUCCIÓN (Manteniendo tu excelente estructura)
// ---------------------------------------------------------
export interface ProductionBatch {
  id: string;
  lotNumber: string; // Ej: L-09052026-01
  productId: string;
  quantityProduced: number; // Aumentará el stockFilled y restará el stockEmpty
  productionDate: Date;
  managerId: string; // ID del encargado responsable (Auditoría)

  // Maquila
  isTollManufacturing: boolean;
  brandId?: string; // Nombre o ID de la marca maquilada

  notes?: string;
  createdAt: Date;
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

  // Trazabilidad
  referenceId: string; // El ID del Lote, de la Merma, de la Venta o de la Compra
  referenceType: "PRODUCTION" | "SHRINKAGE" | "SALE" | "RETURN" | "PURCHASE";

  previousStock: number;
  newStock: number;
  createdAt: Date;
}
