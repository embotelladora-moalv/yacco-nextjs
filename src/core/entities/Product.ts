/**
 * Product Category Enums
 * REFILL: Solo el líquido (Recarga). Obliga al sistema a pedir un envase vacío a cambio.
 * COMPLETE_PRODUCT: Líquido + Envase nuevo (Venta). No pide envase a cambio.
 * ACCESSORY: Surtidores, dispensadores, etc.
 * BOX: Cajas de agua.
 */
export type ProductCategory =
  | "REFILL"
  | "COMPLETE_PRODUCT"
  | "ACCESSORY"
  | "BOX";

/**
 * Packaging Type Enums
 * Diferencia la presentación física en el almacén.
 */
export type PackagingType = "JUG" | "BOTTLE" | "BOX" | "DISPENSER" | "OTHER";

export interface Product {
  id: string; // ID único generado por Firestore
  name: string; // Ej: "Recarga Bidón 20L con Caño" o "Surtidor Básico"
  sku: string; // Código interno único (ej: REC-20L-CC)

  // --- Clasificación ---
  category: ProductCategory;
  packagingType: PackagingType;

  // --- Especificaciones Técnicas ---
  volumeCapacity: number; // Ej: 20, 7, 1, 21. Si es un accesorio, es 0.
  unitOfMeasure: "LITERS" | "UNITS";
  hasTap: boolean; // true si es bidón con caño, false si es sin caño o irrelevante.
  isReturnableContainer: boolean; // true para 20L/7L/21L. false para botellas de 1L o cajas.

  // --- Finanzas ---
  basePrice: number; // Precio de venta público (luego variará por cliente en otra colección)

  // --- Inventario (Kardex) ---
  stockFilled: number; // Unidades llenas listas para la venta (o accesorios disponibles)
  stockEmpty: number; // Unidades de envases vacíos disponibles en planta

  // --- Auditoría ---
  isActive: boolean; // Para "eliminar" lógicamente sin borrar el historial
  createdAt: Date;
  updatedAt: Date;
}
