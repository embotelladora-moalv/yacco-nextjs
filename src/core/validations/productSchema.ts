import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  sku: z.string().min(2, "SKU es requerido"),

  category: z.enum(["REFILL", "COMPLETE_PRODUCT", "ACCESSORY", "BOX"]),
  packagingType: z.enum(["JUG", "BOTTLE", "BOX", "DISPENSER", "OTHER"]),

  volumeCapacity: z.number().min(0, "La capacidad no puede ser negativa"),
  unitOfMeasure: z.enum(["LITERS", "UNITS"]),
  hasTap: z.boolean(),
  isReturnableContainer: z.boolean(),

  basePrice: z.number().min(0, "El precio base debe ser mayor o igual a 0"),

  // No incluimos stockFilled ni stockEmpty aquí porque el usuario no los
  // ingresa manualmente al crear el producto, se manejan vía Kardex/Producción.
});

export type ProductFormValues = z.infer<typeof productSchema>;
