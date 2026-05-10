import { z } from "zod";

export const dailyRouteSchema = z.object({
  truckId: z.string().min(1, "Debe seleccionar un vehículo"),
  driverId: z.string().min(1, "Debe asignar un chofer responsable"),
  assistantId: z.string().optional(),
  initialCash: z.number().min(0, "El efectivo inicial no puede ser negativo"),
  date: z.string().min(1, "La fecha es requerida"),
});

export type DailyRouteFormValues = z.infer<typeof dailyRouteSchema>;
