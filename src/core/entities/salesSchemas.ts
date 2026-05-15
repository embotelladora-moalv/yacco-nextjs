import { z } from "zod";

export const webSaleSchema = z
  .object({
    saleType: z.enum(["PLANT", "ROUTE"]),
    manifestId: z.string().optional(),
    customerId: z.string().min(1, "Debe seleccionar un cliente"),

    // Detalle de productos vendidos
    items: z
      .array(
        z.object({
          productId: z.string().min(1, "Seleccione un producto"),
          quantity: z.coerce.number().min(1, "Mínimo 1 unidad"),
          unitPrice: z.coerce.number().min(0, "Precio inválido"),
        }),
      )
      .min(1, "Agregue al menos un producto a la venta"),

    // Control de envases vacíos que retorna el cliente
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

    // 2. Validar que los pagos coincidan con el total
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

export type WebSaleFormValues = z.infer<typeof webSaleSchema>;
