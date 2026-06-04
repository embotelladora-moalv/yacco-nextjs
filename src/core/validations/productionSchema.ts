import { z } from "zod";

export const productionBatchSchema = z.object({
  productId: z.string().min(1, "Debe seleccionar un producto"),
  quantityProduced: z.number().min(1, "La cantidad debe ser mayor a 0"),
  productionDate: z.string().min(1, "Fecha requerida"),
  managerId: z.string().min(1, "Encargado requerido"),
  isTollManufacturing: z.boolean(), // Quitar el .default(false)
  brandId: z.string().optional(),
  notes: z.string().optional(),
});

export type ProductionBatchValues = z.infer<typeof productionBatchSchema>;
