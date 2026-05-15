import { z } from "zod";

export const paymentSchema = z.object({
  customerId: z.string().min(1, "El ID del cliente es obligatorio"),
  amount: z.coerce.number().min(0.1, "El monto debe ser mayor a 0"),
  date: z.string().min(1, "La fecha es obligatoria"),
  paymentMethod: z.enum(["CASH", "TRANSFER", "CHECK", "OTHER"]),
  reference: z.string().optional(),
  receivedById: z.string().optional().or(z.literal("")),
  notes: z.string().optional(),
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;
