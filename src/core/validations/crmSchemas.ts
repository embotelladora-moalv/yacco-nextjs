import { z } from "zod";

export const customerLocationSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Asigne un nombre (Ej: Principal)"),
  address: z.string().min(5, "La dirección es obligatoria"),
  reference: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  isMain: z.boolean().default(false),
  coordinates: z
    .object({
      lat: z.coerce.number(), // coerce.number para aceptar texto del input y pasarlo a número
      lng: z.coerce.number(),
    })
    .optional(),
});

export const customerSchema = z.object({
  name: z.string().min(2, "El nombre es obligatorio"),
  alias: z.string().optional(),
  documentType: z.enum(["DNI", "RUC", "OTHER"]),
  documentNumber: z.string().min(8, "Documento inválido"),

  // NUEVOS CAMPOS ZOD
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),

  tags: z.array(z.string()).default([]),
  locations: z
    .array(customerLocationSchema)
    .min(1, "Debe registrar al menos una ubicación"),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;

// ... (El resto de los esquemas de ventas quedan igual)
export const saleItemSchema = z.object({
  productId: z.string(),
  quantity: z.coerce.number().min(1, "Debe vender al menos 1"),
  unitPrice: z.coerce.number().min(0),
});

export const saleEmptyReturnSchema = z.object({
  productId: z.string(),
  quantity: z.coerce.number().min(0),
});

export const saleSchema = z
  .object({
    manifestId: z.string().min(1, "Debe pertenecer a una ruta activa"),
    customerId: z.string().min(1, "Debe seleccionar un cliente"),
    items: z
      .array(saleItemSchema)
      .min(1, "La venta debe tener al menos un producto"),
    returnedEmpties: z.array(saleEmptyReturnSchema).default([]),
    paymentMethod: z.enum(["CASH", "DIGITAL", "CREDIT", "MIXED"]),
    cashReceived: z.coerce.number().min(0).default(0),
    digitalReceived: z.coerce.number().min(0).default(0),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const total = data.items.reduce(
      (acc, item) => acc + item.quantity * item.unitPrice,
      0,
    );
    const paid = data.cashReceived + data.digitalReceived;
    if (data.paymentMethod !== "CREDIT" && paid < total) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `El pago (S/ ${paid}) es menor al total de la venta (S/ ${total}). Marque como CRÉDITO si el cliente dejará deuda.`,
        path: ["cashReceived"],
      });
    }
  });

export type SaleFormValues = z.infer<typeof saleSchema>;
