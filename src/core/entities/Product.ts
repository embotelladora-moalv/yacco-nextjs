// src/core/entities/Product.ts

export interface Product {
  id: string;
  name: string;
  volumeCapacity: number;
  hasTap: boolean;
  packagingType: "bottle" | "box" | "non_discardable";
  isMaquila: boolean;
  brandId?: string;
  // AGREGA ESTAS DOS LÍNEAS PARA EL CONTROL DE ALMACÉN:
  stockFilled: number; // Bidones llenos listos para la venta
  stockEmpty: number; // Bidones vacíos (envases) en planta
  isActive: boolean; // Utilizado para Soft Delete
  createdAt: Date;
  updatedAt: Date;
}
