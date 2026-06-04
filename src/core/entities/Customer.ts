export type CustomerType = "INDIVIDUAL" | "COMPANY";

export interface CustomerContact {
  id: string;
  name: string;
  phone: string;
  role: string; // Ej: "Administrador", "Vigilante", "Encargado de Almacén"
}

export interface CustomerLocation {
  id: string;
  name: string;
  address: string;
  reference?: string;
  latitude?: number;
  longitude?: number;
  photoUrl?: string;
  isDefault: boolean;
  // ---> CAMBIO: Contacto específico para esta ubicación <---
  contact?: CustomerContact;
  geoSource?: "inline" | "redirect";
  geoStatus?: "OK" | "UNPARSEABLE" | "OUT_OF_RANGE";
}

export interface Customer {
  id: string;
  type: CustomerType;
  documentId: string;
  documentNumber?: string;   // alias de documentId para compatibilidad
  name: string;
  alias?: string;
  businessName?: string;
  categoryTag?: string;
  email?: string;
  phone: string;
  tags: string[];
  locations: CustomerLocation[];
  // Contactos generales de la empresa/persona
  contacts: CustomerContact[];
  debtAmount: number;
  loanedItems: Record<string, number>;
  customPrices: Record<string, number>;
  stats?: { loanedBottles?: number; totalSales?: number };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
