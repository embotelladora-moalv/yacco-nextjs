export type OrderStatus = "PENDING" | "ASSIGNED" | "DELIVERED" | "CANCELLED";
export type PaymentStatus = "PAID" | "PENDING" | "PARTIAL";

export interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number; // Precio pactado para esta reserva
  itemSaleType: "REFILL" | "FULL" | "BOTTLE" | "STANDARD";
  description?: string;
}

export interface Order {
  id: string;
  customerId: string;
  locationId: string; // ID de la sede exacta donde se debe entregar (vital para el mapa)

  items: OrderItem[];

  // Tiempos y Estado
  expectedDeliveryDate: Date; // Para cuándo lo quiere el cliente
  status: OrderStatus;

  // Vínculo Logístico (Se llena cuando el administrador arma la ruta)
  manifestId?: string; // A qué camión se le asignó esta entrega

  notes?: string; // Ej: "Llamar al llegar", "Tocar fuerte el timbre"

  createdAt: Date;
  updatedAt: Date;
}
