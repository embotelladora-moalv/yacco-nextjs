// src/core/validations/productSchema.ts
import { z } from "zod";

const PACKAGING_TYPES = ["bottle", "box", "non_discardable"] as const;

export const productSchema = z.object({
  name: z
    .string()
    .min(2, { message: "El nombre debe tener al menos 2 caracteres" }),
  // Quitamos z.coerce. Ahora exigimos un número directamente.
  volumeCapacity: z
    .number()
    .positive({ message: "La capacidad debe ser mayor a 0" }),
  // Quitamos los .default()
  hasTap: z.boolean(),
  packagingType: z.enum(PACKAGING_TYPES, {
    message: "Debe seleccionar un tipo de envase válido",
  }),
  isMaquila: z.boolean(),
  brandId: z.string().optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;
