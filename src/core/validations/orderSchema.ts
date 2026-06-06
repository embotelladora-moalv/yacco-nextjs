import { z } from "zod";
import { priceField } from "@/core/utils/priceConfig";

export const orderItemSchema = z.object({
  productId: z.string().min(1, "Debe seleccionar un producto"),
  quantity: z.coerce.number().min(1, "Debe pedir al menos 1 unidad"),
  unitPrice: priceField(),
  itemSaleType: z.enum(["REFILL", "FULL", "BOTTLE", "STANDARD"]).default("STANDARD"),
  description: z.string().optional(),
});

export const orderSchema = z.object({
  customerId: z
    .string()
    .min(1, "Debe seleccionar el cliente que hace el pedido"),
  locationId: z
    .string()
    .min(1, "Debe indicar en qué sede o local se entregará"),

  items: z
    .array(orderItemSchema)
    .min(1, "El pedido debe tener al menos un producto"),

  expectedDeliveryDate: z
    .string()
    .min(1, "Debe indicar la fecha esperada de entrega"),

  notes: z.string().optional(),
});

export type OrderFormValues = z.infer<typeof orderSchema>;
