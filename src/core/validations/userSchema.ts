import { z } from "zod";

export const userSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  email: z.string().email("Correo electrónico inválido"),
  // Ahora roles es un array y obligamos a que tenga al menos 1
  roles: z
    .array(z.enum(["ADMIN", "PRODUCTION", "SALES", "DRIVER", "ASSISTANT"]))
    .min(1, "Debe seleccionar al menos un rol"),
  phone: z.string().optional(),
  // Hacemos la contraseña opcional en el esquema para que al editar no sea obligatoria
  licenseNumber: z.string().nullish(),
  documentNumber: z.string().nullish(),
  password: z
    .string()
    .min(6, "Mínimo 6 caracteres")
    .optional()
    .or(z.literal("")),
  isActive: z.boolean().default(true),
});

export type UserFormValues = z.infer<typeof userSchema>;
