export type OrderStatus = "RESERVED" | "ASSIGNED" | "DELIVERED" | "CANCELLED";
export type OrderType = "PRE_ORDER" | "ROUTE_SALE" | "PLANT_SALE";
export type PaymentMethod = "CASH" | "YAPE" | "PLIN" | "TRANSFER" | "CREDIT";
export type PaymentStatus = "PENDING" | "PARTIAL" | "PAID";

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Order {
  id: string;
  customerId: string;
  locationId?: string;
  routeId?: string;

  // ---> PROPIEDAD AGREGADA PARA VINCULACIÓN CON FACTURACIÓN <---
  billingId?: string;

  type: OrderType;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  amountPaid: number;
  scheduledDate: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
