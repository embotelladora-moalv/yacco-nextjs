import { z } from "zod";

export const truckSchema = z.object({
  plateNumber: z
    .string()
    .min(6, "La placa debe tener al menos 6 caracteres")
    .toUpperCase(),
  alias: z.string().min(3, "El alias debe ser descriptivo"),
  capacity: z.number().int().min(1, "La capacidad debe ser al menos 1 bidón"),
});

export type TruckFormValues = z.infer<typeof truckSchema>;
