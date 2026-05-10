import { z } from "zod";

export const routeLoadItemSchema = z.object({
  productId: z.string().min(1, "Seleccione un producto"),
  quantity: z.number().int().min(1, "La cantidad debe ser mayor a 0"),
});

export const routeLoadSchema = z.object({
  routeId: z.string().min(1, "Debe seleccionar una ruta activa"),
  items: z
    .array(routeLoadItemSchema)
    .min(1, "Debe agregar al menos un producto a la carga"),
});

export type RouteLoadFormValues = z.infer<typeof routeLoadSchema>;
