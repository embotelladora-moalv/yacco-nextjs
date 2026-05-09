// src/core/validations/batchSchema.ts
import { z } from "zod";

export const batchDetailSchema = z.object({
  productId: z.string().min(1, { message: "Debe seleccionar un producto" }),
  // Quitamos el coerce
  quantityProduced: z
    .number()
    .positive({ message: "La cantidad debe ser mayor a 0" }),
});

export const batchSchema = z.object({
  // Manejaremos la fecha como texto en el formulario (YYYY-MM-DD)
  productionDate: z
    .string()
    .min(1, { message: "La fecha de producción es obligatoria" }),
  managerId: z.string().min(1, { message: "ID del encargado es obligatorio" }),
  // Quitamos el default()
  status: z.enum(["draft", "completed", "cancelled"]),
  notes: z.string().optional(),
  details: z
    .array(batchDetailSchema)
    .min(1, { message: "Agregue al menos un producto al lote" }),
});

export type BatchFormValues = z.infer<typeof batchSchema>;
export type BatchDetailFormValues = z.infer<typeof batchDetailSchema>;
