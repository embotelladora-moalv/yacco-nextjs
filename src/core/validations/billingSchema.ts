import { z } from "zod";

export const billingSchema = z.object({
  customerId: z.string().min(1, "Seleccione un cliente"),
  type: z.enum(["BOLETA", "FACTURA", "GUIA_REMISION", "NOTA_CREDITO"]),
  orderIds: z
    .array(z.string())
    .min(1, "Debe incluir al menos un pedido para facturar"),
  totalAmount: z.number().min(0),
  issueDate: z.string(),
});

export type BillingFormValues = z.infer<typeof billingSchema>;
