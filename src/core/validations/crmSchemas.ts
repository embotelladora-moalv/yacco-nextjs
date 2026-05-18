// src/core/validations/crmSchemas.ts
import { z } from "zod";

export const customerLocationSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Asigne un nombre (Ej: Principal)"),
  address: z.string().nullish(),
  reference: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  isMain: z.boolean().default(false),
  ubigeo: z.string().max(6).optional().or(z.literal("")),
  imageUrl: z.string().optional(),

  coordinates: z
    .object({
      lat: z.coerce.number(),
      lng: z.coerce.number(),
    })
    .optional(),
});

export const customerSchema = z.object({
  name: z.string().min(2, "El nombre es obligatorio"),
  alias: z.string().optional(),
  documentType: z.enum(["DNI", "RUC", "OTHER"]),
  documentNumber: z.string().min(8, "Documento inválido"),

  contactName: z.string().optional(),
  contactPhone: z.string().optional(),

  alwaysRequiresBilling: z.boolean().default(false),

  customPrices: z
    .array(
      z.object({
        productId: z.string(),
        productName: z.string(),
        refillPrice: z.coerce.number().min(0).optional(),
        fullPrice: z.coerce.number().min(0).optional(),
        bottlePrice: z.coerce.number().min(0).optional(),
      }),
    )
    .optional()
    .default([]),

  tags: z.array(z.string()).default([]),
  locations: z
    .array(customerLocationSchema)
    .min(1, "Debe registrar al menos una ubicación"),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;

export const saleItemSchema = z.object({
  productId: z.string().min(1, "Seleccione un producto"),
  quantity: z.coerce.number().min(1, "Debe vender al menos 1"),
  unitPrice: z.coerce.number().min(0),
  description: z.string().optional(),
  itemSaleType: z
    .enum(["REFILL", "FULL", "BOTTLE", "STANDARD"])
    .default("STANDARD"),
});

export const saleEmptyReturnSchema = z.object({
  productId: z.string(),
  quantity: z.coerce.number().min(0),
});

export const saleSchema = z
  .object({
    saleType: z.enum(["PLANT", "ROUTE"]),
    manifestId: z.string().optional(),
    customerId: z.string().min(1, "Debe seleccionar un cliente"),

    // 🔥 NUEVOS CAMPOS PARA SUNAT
    requiresBilling: z.boolean().default(false), // Generar Boleta/Factura
    requiresGuide: z.boolean().default(false),

    items: z
      .array(saleItemSchema)
      .min(1, "Agregue al menos un producto a la venta"),

    returnedEmpties: z.array(saleEmptyReturnSchema).default([]),

    paymentMethod: z.enum(["CASH", "DIGITAL", "CREDIT", "MIXED"]),
    cashReceived: z.coerce.number().default(0),
    digitalReceived: z.coerce.number().default(0),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
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

    const totalReceived = data.cashReceived + data.digitalReceived;

    // 🔥 MODIFICADO: Ahora permite pagos parciales (menores al total), pero prohíbe estrictamente el valor 0
    if (data.paymentMethod === "CASH" && data.cashReceived <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El monto en efectivo debe ser mayor a 0",
        path: ["cashReceived"],
      });
    }

    if (data.paymentMethod === "DIGITAL" && data.digitalReceived <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El monto digital debe ser mayor a 0",
        path: ["digitalReceived"],
      });
    }

    if (data.paymentMethod === "MIXED" && totalReceived <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El total recibido en método mixto debe ser mayor a 0",
        path: ["cashReceived"],
      });
    }
  });

export type SaleFormValues = z.infer<typeof saleSchema>;
