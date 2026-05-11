import { z } from "zod";

// Validamos cada línea individual del pedido
export const dispatchItemSchema = z.object({
  productId: z.string().min(1, "Debe seleccionar un producto"),
  quantityRequested: z.coerce.number().min(1, "Debe cargar al menos 1 unidad"),
});

// Validamos el Manifiesto completo
export const dispatchManifestSchema = z.object({
  driverId: z.string().min(1, "Debe asignar un chofer responsable"),
  assistantId: z.string().optional(), // <-- NUEVO: Auxiliar
  truckPlate: z.string().min(6, "Ingrese una placa").toUpperCase(),
  initialPettyCash: z.coerce.number().min(0).default(0), // <-- NUEVO: Caja Chica / Sencillo
  items: z.array(dispatchItemSchema).min(1, "Debe llevar al menos un producto"),
  notes: z.string().optional(),
});

export type DispatchManifestFormValues = z.infer<typeof dispatchManifestSchema>;

// Validamos lo que regresa de cada lote específico que se llevó el chofer
export const liquidationItemSchema = z
  .object({
    productId: z.string(),
    lotNumber: z.string(),
    quantityLoaded: z.number(), // Lo que se llevó (Solo lectura para validación)
    quantityReturnedFull: z.coerce.number().min(0, "No puede ser negativo"),
    wasteQuantity: z.coerce.number().min(0, "No puede ser negativo").default(0),
  })
  .superRefine((data, ctx) => {
    if (data.quantityReturnedFull + data.wasteQuantity > data.quantityLoaded) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El retorno y la merma superan lo que se llevó.",
        path: ["quantityReturnedFull"],
      });
    }
  });

// Validamos los envases vacíos que trae el chofer
export const liquidationEmptyReturnSchema = z.object({
  productId: z.string(),
  quantityReturned: z.coerce.number().min(0, "No puede ser negativo"),
});

// El formulario completo de liquidación
export const liquidationManifestSchema = z.object({
  items: z.array(liquidationItemSchema),
  returnedEmpties: z.array(liquidationEmptyReturnSchema),
  // Hacemos el cuadre de efectivo opcional (default 0)
  cashReported: z.coerce.number().min(0).optional().default(0),
  digitalPaymentsReported: z.coerce.number().min(0).optional().default(0),
  notes: z.string().optional(),
});

export type LiquidationManifestFormValues = z.infer<
  typeof liquidationManifestSchema
>;

// Esquema para la "Parada en Pits" (Recarga / Descarga a mitad de ruta)
export const reloadManifestSchema = z.object({
  // Descarga
  returnedEmpties: z.array(liquidationEmptyReturnSchema).optional().default([]),
  cashAdvance: z.coerce.number().min(0).optional().default(0), // Dinero que deja en planta

  // Recarga
  newItems: z.array(dispatchItemSchema).optional().default([]), // Nuevos productos que pide
  additionalPettyCash: z.coerce.number().min(0).optional().default(0), // Más sencillo que se le da

  notes: z.string().optional(),
});

export type ReloadManifestFormValues = z.infer<typeof reloadManifestSchema>;
