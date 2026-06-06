import { z } from "zod";

export const paymentBaseSchema = z.object({
  customerId: z.string().min(1, "El ID del cliente es obligatorio"),
  amount: z.number().min(0.1, "El monto debe ser mayor a 0"),
  date: z.string().min(1, "La fecha es obligatoria"),
  paymentMethod: z.enum(["CASH", "TRANSFER", "YAPE_PLIN"]),
  bankId: z.string().optional().or(z.literal("")),
  bankName: z.string().optional().or(z.literal("")),
  reference: z.string().optional(),
  receivedById: z.string().optional().or(z.literal("")),
  notes: z.string().optional(),
  allocationMode: z.enum(["FIFO", "DIRECTED"]).default("FIFO"),
  allocations: z
    .array(
      z.object({
        saleId: z.string(),
        amount: z.coerce.number().min(0),
      })
    )
    .optional()
    .default([]),
});

export const paymentSchema = paymentBaseSchema
  .refine(
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
  )
  .superRefine((data, ctx) => {
    if (data.allocationMode === "DIRECTED") {
      const activeAllocations = data.allocations?.filter((a) => a.amount > 0) || [];
      if (activeAllocations.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Debe asignar al menos una venta con monto mayor a 0 en el modo dirigido",
          path: ["allocations"],
        });
      } else {
        const sum = activeAllocations.reduce((acc, curr) => acc + curr.amount, 0);
        if (Math.abs(sum - data.amount) > 0.01) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `La suma de las asignaciones (S/ ${sum.toFixed(2)}) debe ser igual al monto total (S/ ${data.amount.toFixed(2)})`,
            path: ["amount"],
          });
        }
      }
    }
  });

export type PaymentFormValues = z.infer<typeof paymentSchema>;
