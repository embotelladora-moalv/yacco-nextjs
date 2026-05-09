/**
 * Customer Entity - YACCO ERP
 * Cumple con: Multi-ubicación, Multi-contacto, Deudas y Categorización.
 */
export interface Customer {
  id: string;
  documentType: "RUC" | "DNI";
  documentNumber: string; // RUC 20612769151
  businessName: string; // Razón Social
  alias: string; // REQUISITO: Nombre comercial o amigable
  legalAddress: string; // Dirección Fiscal

  // Categorización Gestionable (ej: "Parque")
  categoryTag: string;

  // REQUISITO: Una o más ubicaciones con foto y GPS
  locations: {
    id: string;
    alias: string; // Ej: "Planta Principal"
    address: string;
    latitude: number;
    longitude: number;
    photoUrl?: string; // Foto de la fachada
  }[];

  // REQUISITO: Uno o más contactos por empresa
  contacts: {
    id: string; // <--- Agrega esta propiedad
    name: string;
    phone: string;
    role: string; // Ej: "Encargado de Compras"
  }[];

  // REQUISITO: Precios de venta y recarga variables por cliente
  customPricing?: {
    productId: string; // ID del bidón (20L, 7L, etc.)
    specialPrice: number;
  }[];

  // REQUISITO: Seguimiento de Deuda y Préstamo
  stats: {
    currentDebt: number; // Deuda monetaria total
    loanedBottles: number; // Bidones de 20L/7L en préstamo
    orderFrequencyDays: number; // Reporte sugerido de frecuencia
    lastSaleDate?: Date;
    lastVisitDate?: Date;
  };

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
