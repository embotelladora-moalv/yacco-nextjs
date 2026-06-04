/**
 * Representa un evento de carga (cuando el camión se estaciona en planta y sube bidones).
 * Un camión puede tener varios 'RouteLoad' en un mismo día.
 */
export interface RouteLoadItem {
  productId: string;
  productName: string;
  quantity: number;
}

export interface RouteLoad {
  id: string;
  routeId: string; // ID de la DailyRoute activa
  truckId: string; // ID del camión
  items: RouteLoadItem[]; // Lo que se subió en este viaje
  createdAt: Date;
  createdBy: string; // Quién autorizó la carga (Encargado)
}
