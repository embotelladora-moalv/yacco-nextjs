// Archivo: src/core/validations/financeSchemas.ts
import { z } from "zod";

export const cashMovementSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  categoryId: z.string().min(1, "Debe seleccionar un motivo/categoría"),
  categoryName: z.string(), // Lo llenaremos en el frontend antes de enviar
  amount: z.coerce.number().min(0.1, "El monto no puede ser cero"),
  description: z.string().min(3, "Brinde un detalle (Ej: Peaje Sur)"),
  paymentMethod: z.enum(["CASH", "TRANSFER", "CARD", "OTHER"]).default("CASH"),
  manifestId: z.string().optional(),
  date: z.string().min(1, "Debe seleccionar la fecha"),
});

export type CashMovementFormValues = z.infer<typeof cashMovementSchema>;
