// ---------------------------------------------------------
// 1. EL CLIENTE Y SUS UBICACIONES
// ---------------------------------------------------------
export interface CustomerContainerBalance {
  productId: string;
  balance: number;
}

export interface ContainerLogDelta { productId: string; delta: number; }
export interface ContainerLogBalance { productId: string; balance: number; }
export interface CustomerContainerLog {
  id: string;
  customerId: string;
  type: "SALE" | "DELIVERY" | "ADJUSTMENT" | "REVERSAL";
  saleId?: string;
  manifestId?: string;
  delta: ContainerLogDelta[];          // cambio neto por producto (entregado - devuelto)
  detail: {
    items: { productId: string; quantity: number }[];
    returnedEmpties: { productId: string; quantity: number }[];
  };
  balanceAfter: ContainerLogBalance[];  // snapshot del saldo resultante
  reason?: string;                       // obligatorio solo para ADJUSTMENT (fase 2)
  userId: string;
  createdAt: Date;
}

export interface CustomerLocation {
  id: string;
  name: string;
  address?: string | null;
  reference?: string;
  contactName?: string;
  contactPhone?: string;
  ubigeo?: string;
  imageUrl?: string;
  coordinates?: { lat: number; lng: number };
  isMain: boolean;
}

export interface Customer {
  id: string;
  name: string;
  alias?: string;
  documentType: "DNI" | "RUC" | "OTHER";
  documentNumber: string;

  // NUEVOS CAMPOS: Contacto Principal (Dueño o Pagador)
  contactName?: string;
  contactPhone?: string;

  tags: string[];
  locations: CustomerLocation[];
  containerBalances: CustomerContainerBalance[];
  debtAmount?: number;
  isActive: boolean;

  lastSaleDate?: string | null;
  monetaryDebt?: number;

  // 🔥 AGREGA ESTA LÍNEA AQUÍ:
  alwaysRequiresBilling?: boolean;

  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------
// 2. LA VENTA (El Ticket de la Ruta)
// ---------------------------------------------------------
export interface SaleItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  lotNumber?: string; // Lote asignado
}

export interface SaleEmptyReturn {
  productId: string;
  quantity: number;
}

export interface Sale {
  id: string;
  manifestId: string;
  driverId: string;
  registeredBy?: string;
  customerId: string;
  customerName?: string;
  customerAlias?: string;
  items: SaleItem[];
  returnedEmpties: SaleEmptyReturn[];
  totalAmount: number;
  paymentMethod: "CASH" | "DIGITAL" | "CREDIT" | "MIXED";
  cashReceived: number;
  digitalReceived: number;
  notes?: string;
  status: "COMPLETED" | "CANCELLED";
  paymentStatus: "UNPAID" | "PARTIAL" | "PAID"; // <-- NUEVO
  remainingBalance: number;
  isBilled?: boolean;
  sunatDocumentId?: string | null;
  date?: string;
  dateProcess?: string;
  cancelledBy?: string;
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DebtPayment {
  id: string;
  customerId: string;
  amount: number;
  date: string;
  paymentMethod: string;
  appliedTo: {
    // Detalle de la distribución FIFO
    saleId: string;
    amountApplied: number;
  }[];
  status: "ACTIVE" | "CANCELLED"; // Para soportar anulaciones
  receivedById: string;
  reference?: string;
  notes?: string;
  createdAt: any;
}
