import { z } from "zod";

export const paymentSchema = z.object({
  customerId: z.string().min(1, "Debe seleccionar un cliente"),
  amount: z.number().min(0.1, "El monto debe ser mayor a 0"),
  method: z.enum(["CASH", "YAPE", "PLIN", "TRANSFER"]),
  reference: z.string().optional(), // Ej: Número de operación de Yape
  notes: z.string().optional(),
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;
