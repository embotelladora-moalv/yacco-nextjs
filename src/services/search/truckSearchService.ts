import { Truck } from "@/core/entities/Truck";

export const truckSearchService = {
  async searchTrucks(params: {
    query: string;
    page: number;
    hitsPerPage: number;
  }) {
    // Aquí conectarías con Algolia en el futuro.
    // Por ahora, manejamos la lógica de paginación local escalable.
    return { data: [] as Truck[], totalPages: 1, totalHits: 0 };
  },
};
