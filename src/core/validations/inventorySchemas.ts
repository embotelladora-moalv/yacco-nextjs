import { z } from "zod";

// ---------------------------------------------------------
// 1. SCHEMA PARA CREAR/EDITAR PRODUCTOS
// ---------------------------------------------------------
export const productSchema = z.object({
  // Identificación
  name: z.string().min(3, "El nombre del producto es obligatorio"),
  sku: z.string().min(2, "El código SKU es obligatorio"),

  // Clasificación Técnica
  operationalCategory: z
    .enum(["FULL_PRODUCT", "EMPTY_CONTAINER", "ACCESSORY"])
    .default("FULL_PRODUCT"),
  packagingType: z.string().min(1, "Debe seleccionar un tipo de empaque"),
  volume: z.coerce.number().min(0, "El volumen debe ser mayor o igual a 0"),
  unit: z.enum(["L", "ml", "Gal", "Oz"]).default("L"),

  // Propiedades Físicas
  hasTap: z.boolean().default(false),
  isReturnableContainer: z.boolean().default(true), // Vital para Kardex de vacíos

  // Finanzas (Los 3 precios comerciales)
  priceRefill: z.coerce.number().min(0).default(0), // Precio solo líquido
  priceFull: z.coerce.number().min(0).default(0), // Precio líquido + envase
  priceEmpty: z.coerce.number().min(0).default(0), // Precio solo envase

  // Stocks iniciales (Solo para la creación, luego se bloquean)
  initialStockEmpty: z.coerce.number().min(0).default(0),
  initialStockFilled: z.coerce.number().min(0).default(0),

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
    brandId: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.isTollManufacturing &&
      (!data.brandId || data.brandId.trim() === "")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debe especificar la marca si es maquila",
        path: ["brandId"],
      });
    }
  });

export type ProductionBatchFormValues = z.infer<typeof productionBatchSchema>;
