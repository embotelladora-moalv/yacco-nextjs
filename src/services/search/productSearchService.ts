import { Product, ProductCategory } from "@/core/entities/Product";

export const productSearchService = {
  /**
   * Búsqueda híbrida y paginada de productos.
   * Listo para conectar con Algolia en Producción.
   */
  async searchProducts(params: {
    query: string;
    category?: ProductCategory | "ALL";
    page: number;
    hitsPerPage: number;
  }) {
    try {
      // IMPLEMENTACIÓN ALGOLIA (Descomentar en Producción):
      /*
      const searchClient = algoliasearch(process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!, process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!);
      const index = searchClient.initIndex("products_index");
      const { hits, nbPages, nbHits } = await index.search<Product>(params.query, {
        page: params.page,
        hitsPerPage: params.hitsPerPage,
        filters: params.category && params.category !== "ALL" ? `category:'${params.category}'` : "",
      });
      return { data: hits, totalPages: nbPages, totalHits: nbHits };
      */

      // FALLBACK MOCK PARA DESARROLLO (Simulación de respuesta):
      // En un entorno real sin Algolia, aquí harías un query a Firestore.
      console.warn(
        "Usando Fallback de Búsqueda Yacco (Mock Algolia) para Productos",
      );
      return {
        data: [], // Aquí retornas los datos obtenidos localmente
        totalPages: 1,
        totalHits: 0,
      };
    } catch (error) {
      console.error("Error en Product Search Service:", error);
      return { data: [], totalPages: 0, totalHits: 0 };
    }
  },
};
