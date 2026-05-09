import { z } from "zod";

export const customerSchema = z.object({
  documentType: z.enum(["RUC", "DNI"]),
  documentNumber: z.string().min(8).max(11),
  businessName: z.string().min(3, "Requerido"),
  alias: z.string().min(2, "Alias amigable requerido"), // Validamos el nuevo campo
  legalAddress: z.string().min(5, "Requerido"),
  categoryTag: z.string().min(1, "Seleccione zona"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.string().length(0)),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
