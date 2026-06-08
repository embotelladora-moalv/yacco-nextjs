import { z } from "zod";
import { priceField } from "@/core/utils/priceConfig";

export const productSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  sku: z.string().min(3, "El SKU es obligatorio"),
  operationalCategory: z.enum(["FULL_PRODUCT", "EMPTY_CONTAINER", "ACCESSORY"]),
  packagingType: z.string().min(1, "Seleccione un tipo de empaque"),

  // CAMPOS DE MAQUILA
  isMaquila: z.boolean().default(false),
  brandName: z.string().optional(),

  // Especificaciones físicas
  volume: z.coerce.number().min(0),
  unit: z.enum(["L", "ml", "Gal", "Oz"]),
  hasTap: z.boolean().optional().nullable().default(null),
  isReturnableContainer: z.boolean().default(true),

  // Precios
  priceRefill: priceField(),
  priceFull: priceField(),
  priceEmpty: priceField(),

  // Stocks Iniciales
  initialStockFilled: z.coerce.number().min(0),
  initialStockEmpty: z.coerce.number().min(0),

  isActive: z.boolean().default(true),
});

export type ProductFormValues = z.infer<typeof productSchema>;

// ---------------------------------------------------------
// 2. SCHEMA PARA LOTES DE PRODUCCIÓN (El que usaremos luego)
// ---------------------------------------------------------
export const productionBatchSchema = z
  .object({
    productionDate: z.string().min(1, "La fecha es obligatoria"), // String para inputs tipo date
    expirationDate: z.string().optional(), // Vencimiento opcional (formato YYYY-MM-DD)
    productId: z.string().min(1, "Debe seleccionar el producto producido"),
    quantityProduced: z.coerce
      .number()
      .min(1, "Debe producir al menos 1 unidad"),

    isTollManufacturing: z.boolean().default(false),
    brandName: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.isTollManufacturing &&
      (!data.brandName || data.brandName.trim() === "")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debe especificar la marca si es maquila",
        path: ["brandName"],
      });
    }
  });

export type ProductionBatchFormValues = z.infer<typeof productionBatchSchema>;

// ---------------------------------------------------------
// 3. SCHEMA PARA MERMAS DE PLANTA
// ---------------------------------------------------------
export const shrinkageSchema = z
  .object({
    productId: z.string().min(1, "Debe seleccionar un producto"),
    lotNumber: z.string().optional(),
    quantity: z.coerce.number().min(1, "La cantidad debe ser mayor a 0"),
    phase: z.enum(["FILLED", "EMPTY"]),
    reasonId: z.string().min(1, "Debe seleccionar un motivo"),
    isRecyclable: z.boolean().default(false),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.phase === "FILLED" && (!data.lotNumber || data.lotNumber === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El lote es obligatorio para mermas de producto lleno",
        path: ["lotNumber"],
      });
    }
  });

export type ShrinkageFormValues = z.infer<typeof shrinkageSchema>;
