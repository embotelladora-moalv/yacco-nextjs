// Define el detalle de qué producto y de qué lote exacto se está subiendo al camión
export interface DispatchItem {
  productId: string;
  lotNumber: string; // <-- EL CORAZÓN DE LA TRAZABILIDAD (Ej: L-1715298123)
  quantityLoaded: number; // Cuántos subieron al camión en la mañana

  // Estos se llenan en la tarde, durante la Liquidación
  quantitySold: number; // Cuántos se entregaron a los clientes
  quantityReturnedFull: number; // Cuántos sobraron y regresan intactos al almacén
  quantityReturnedEmpty?: number; // Para el resumen final de vacíos por producto
  wasteQuantity: number; // Cuántos se rompieron o perdieron en la ruta (Suma de waste[].quantity)
  waste?: {
    quantity: number;
    reasonId: string;
    isRecyclable: boolean;
  }[];
}

// Detalle de los vacíos que el chofer trae de regreso en la tarde
export interface DispatchEmptyReturn {
  productId: string;
  quantityReturned: number; // Sumará al stockEmpty de la planta
}

export interface DispatchManifest {
  id: string;
  manifestNumber: string; // Ej: DESP-20260510-01

  // Actores
  driverId: string; // El usuario con rol DRIVER
  assistantId?: string; // Auxiliar o copiloto (Opcional)
  dispatcherId: string; // El almacenero que autorizó la salida
  truckPlate: string; // Placa del vehículo

  // Tiempos y Estado
  dispatchDate: Date; // Fecha y hora de salida
  liquidationDate?: Date; // Fecha y hora de regreso/cuadre
  liquidatedAt?: Date; // Fecha exacta de la liquidación (agregado)
  status: "PENDING" | "ON_ROUTE" | "LIQUIDATED";
  cashAdvances?: number; // Dinero que entrega a mitad de ruta

  // EL CAMBIO PRINCIPAL: Estandarizado a 'items'
  items: DispatchItem[];

  // El retorno (Se llena en la liquidación)
  returnedEmpties: DispatchEmptyReturn[];

  // Finanzas (Cuadre de caja de la ruta)
  initialPettyCash?: number; // Caja chica o sencillo que se le da al salir
  cashExpected: number;
  cashReported: number;
  realCashReceived?: number; // Efectivo real validado en tesorería (agregado)
  digitalPaymentsExpected: number; // Yape/Plin/Transferencias
  digitalPaymentsReported: number;

  notes?: string;
  liquidationNotes?: string; // Notas de cierre (agregado)

  createdAt: Date;
  updatedAt: Date;
}
