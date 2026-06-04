export type RouteStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface DailyRoute {
  id: string;
  date: Date;
  truckId: string;

  driverId: string;
  assistantId?: string;

  initialCash: number;
  totalExpenses: number;

  status: RouteStatus;
  currentLocation?: {
    latitude: number;
    longitude: number;
    lastUpdated: Date;
  };

  // ---> ¡AGREGA ESTA LÍNEA! <---
  currentInventory?: Record<string, number>;
  // Ej: { "id_producto_1": 50, "id_producto_2": 20 }

  createdAt: Date;
  updatedAt: Date;
}
