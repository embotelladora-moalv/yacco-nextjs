import { Customer } from "@/core/entities/Customer";

// Configuración de Algolia (Usa variables de entorno en producción)
// const searchClient = algoliasearch(process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!, process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!);
// const index = searchClient.initIndex("customers_index");

export const customerSearchService = {
  /**
   * Búsqueda híbrida y paginada.
   * Si hay Algolia configurado, lo usa. Si no, hace un fallback (simulado aquí para desarrollo).
   */
  async searchCustomers(params: {
    query: string;
    category?: string;
    page: number;
    hitsPerPage: number;
  }) {
    try {
      // IMPLEMENTACIÓN ALGOLIA (Descomentar en Producción):
      /*
      const { hits, nbPages, nbHits } = await index.search<Customer>(params.query, {
        page: params.page,
        hitsPerPage: params.hitsPerPage,
        filters: params.category && params.category !== "ALL" ? `categoryTag:'${params.category}'` : "",
      });
      return { data: hits, totalPages: nbPages, totalHits: nbHits };
      */

      // FALLBACK MOCK (Para que puedas probar la UI ahora mismo):
      console.warn("Usando Fallback de Búsqueda Yacco (Mock Algolia)");
      return {
        data: [], // Aquí irían los datos locales filtrados en tu entorno de pruebas
        totalPages: 1,
        totalHits: 0,
      };
    } catch (error) {
      console.error("Error en Search Service:", error);
      return { data: [], totalPages: 0, totalHits: 0 };
    }
  },
};
