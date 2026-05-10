import { z } from "zod";

export const orderItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  subtotal: z.number().min(0),
  isReplacement: z.boolean().default(false), // Requerimiento: Cambio por mal estado
  replacementReason: z.string().optional(),
});

export const orderSchema = z.object({
  customerId: z.string().min(1, "Seleccione un cliente"),
  locationId: z.string().optional(), // Requerimiento: Múltiples ubicaciones
  routeId: z.string().optional(),
  type: z.enum(["PRE_ORDER", "ROUTE_SALE", "PLANT_SALE"]),
  status: z.enum(["RESERVED", "ASSIGNED", "DELIVERED", "CANCELLED"]),

  items: z.array(orderItemSchema).min(1),

  // --- NUEVOS CAMPOS DEL ENUNCIADO ---
  returnedDrums: z.record(z.string(), z.number()).default({}), // Retorno de vacíos
  loanedAccessories: z.record(z.string(), z.number()).default({}), // Préstamo de surtidores
  // -----------------------------------

  totalAmount: z.number().min(0),
  paymentMethod: z.enum(["CASH", "YAPE", "PLIN", "TRANSFER", "CREDIT"]),
  paymentStatus: z.enum(["PENDING", "PARTIAL", "PAID"]),
  amountPaid: z.number().min(0),
  scheduledDate: z.string().min(1),
});

export type OrderFormValues = z.infer<typeof orderSchema>;
