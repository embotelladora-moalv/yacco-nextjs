import { z } from "zod";

export const paymentBaseSchema = z.object({
  customerId: z.string().min(1, "El ID del cliente es obligatorio"),
  amount: z.number().min(0.1, "El monto debe ser mayor a 0"),
  date: z.string().min(1, "La fecha es obligatoria"),
  paymentMethod: z.enum(["CASH", "TRANSFER", "CHECK", "OTHER"]),
  bankId: z.string().optional().or(z.literal("")),
  bankName: z.string().optional().or(z.literal("")),
  reference: z.string().optional(),
  receivedById: z.string().optional().or(z.literal("")),
  notes: z.string().optional(),
});

export const paymentSchema = paymentBaseSchema.refine(
  (data) => {
    if (data.paymentMethod === "TRANSFER" && (!data.bankId || data.bankId.trim() === "")) {
      return false;
    }
    return true;
  },
  {
    message: "El banco es obligatorio para transferencias",
    path: ["bankId"],
  }
);

export type PaymentFormValues = z.infer<typeof paymentSchema>;
