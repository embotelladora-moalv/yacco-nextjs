import { z } from "zod";

export const customerLocationSchema = z.object({
  id: z.string(),
  name: z.string().min(2, "Nombre de ubicación requerido"),
  address: z.string().min(5, "Dirección requerida"),
  reference: z.string().optional(),
  contact: z
    .object({
      name: z.string(),
      phone: z.string(),
      role: z.string(),
    })
    .optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  photoUrl: z.string().optional(),
  isDefault: z.boolean().default(false),
});

export const customerContactSchema = z.object({
  id: z.string(),
  name: z.string().min(2, "Nombre requerido"),
  phone: z.string().min(6, "Teléfono requerido"),
  role: z.string().optional(),
});

export const customerSchema = z.object({
  type: z.enum(["INDIVIDUAL", "COMPANY"]),
  documentId: z.string().min(8, "DNI/RUC inválido"),
  name: z.string().min(3, "El nombre o razón social es muy corto"),
  email: z.string().email("Correo inválido").optional().or(z.literal("")),
  phone: z.string().min(6, "Teléfono principal requerido"),

  tags: z.array(z.string()).default([]), // Etiquetas de zona/categoría

  locations: z
    .array(customerLocationSchema)
    .min(1, "Debe agregar al menos una dirección"),
  contacts: z.array(customerContactSchema).default([]),

  // Los diccionarios los inicializamos vacíos en la creación
  customPrices: z.record(z.string(), z.number()).default({}),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
