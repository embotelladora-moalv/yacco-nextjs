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
    saleType: z.enum(["PLANT", "ROUTE"]), // <-- NUEVO CAMPO
    manifestId: z.string().optional(), // <-- AHORA ES OPCIONAL
    customerId: z.string().min(1, "Debe seleccionar un cliente"),

    items: z
      .array(
        z.object({
          productId: z.string().min(1, "Seleccione un producto"),
          quantity: z.coerce.number().min(1, "Mínimo 1 unidad"),
          unitPrice: z.coerce.number().min(0, "Precio inválido"),
        }),
      )
      .min(1, "Agregue al menos un producto a la venta"),

    returnedEmpties: z
      .array(
        z.object({
          productId: z.string(),
          quantity: z.coerce.number().min(1),
        }),
      )
      .default([]),

    paymentMethod: z.enum(["CASH", "DIGITAL", "CREDIT", "MIXED"]),
    cashReceived: z.coerce.number().default(0),
    digitalReceived: z.coerce.number().default(0),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // 1. Validar que la venta en ruta tenga un camión asignado
    if (
      data.saleType === "ROUTE" &&
      (!data.manifestId || data.manifestId.trim() === "")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debe seleccionar el camión/manifiesto en ruta",
        path: ["manifestId"],
      });
    }

    // 2. Validar que los pagos coincidan con el total (si no es crédito)
    const totalAmount = data.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const totalReceived = data.cashReceived + data.digitalReceived;

    if (data.paymentMethod !== "CREDIT" && totalReceived < totalAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El monto recibido no cubre el total de la venta",
        path: ["cashReceived"],
      });
    }
  });

export type SaleFormValues = z.infer<typeof saleSchema>;
