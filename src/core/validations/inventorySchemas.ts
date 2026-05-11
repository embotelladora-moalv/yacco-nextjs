import { z } from "zod";

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
  hasTap: z.boolean().default(false),
  isReturnableContainer: z.boolean().default(true),

  // Precios
  priceRefill: z.coerce.number().min(0),
  priceFull: z.coerce.number().min(0),
  priceEmpty: z.coerce.number().min(0),

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
