// ---------------------------------------------------------
// 1. EL CLIENTE Y SUS UBICACIONES
// ---------------------------------------------------------
export interface CustomerContainerBalance {
  productId: string;
  balance: number;
}

export interface CustomerLocation {
  id: string;
  name: string;
  address: string;
  reference?: string;
  contactName?: string;
  contactPhone?: string;
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
}

export interface SaleEmptyReturn {
  productId: string;
  quantity: number;
}

export interface Sale {
  id: string;
  manifestId: string;
  driverId: string;
  customerId: string;
  items: SaleItem[];
  returnedEmpties: SaleEmptyReturn[];
  totalAmount: number;
  paymentMethod: "CASH" | "DIGITAL" | "CREDIT" | "MIXED";
  cashReceived: number;
  digitalReceived: number;
  notes?: string;
  status: "COMPLETED" | "CANCELLED";
  createdAt: Date;
  updatedAt: Date;
}
