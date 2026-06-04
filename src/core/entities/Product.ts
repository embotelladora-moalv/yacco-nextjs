// Barrel de compatibilidad: los módulos importan desde aquí.
// La entidad real vive en Inventory.ts.
export type { Product, ProductionBatch, ShrinkageLog, KardexLog } from "./Inventory";

export type ProductCategory = "REFILL" | "COMPLETE_PRODUCT" | "ACCESSORY" | "BOX";
