# Patrón de Lectura Escalable en Firestore — Yacco ERP

Este documento detalla el patrón de arquitectura de lectura optimizado e implementado en **Yacco ERP** para garantizar la escalabilidad, reducir la latencia de respuesta y disminuir los costos de facturación de Firestore (evitando descargas innecesarias de colecciones masivas como `customers` con ~21k registros).

---

## 1. Componentes del Patrón

El patrón de lectura escalable consta de cuatro pilares:

### A. Paginación por Cursor (Server-Side)
Evitamos el uso de offsets (`skip`), ya que Firestore cobra e internamente lee todos los documentos omitidos. 

*   **Helper genérico:** Ubicado en [_pagination.ts](file:///c:/Users/win11/Documents/workspace/moalv/yacco-nextjs/src/services/repositories/_pagination.ts).
    *   Usa `limit(pageSize + 1)` para detectar de forma eficiente si existe una página siguiente sin realizar llamadas adicionales.
    *   Serializa los valores de ordenación (`orderBy`) en una cadena Base64 que se pasa de manera segura al cliente.
    *   Reconstruye de forma segura tipos complejos (como `Timestamp` de Firestore) al deserializar.
*   **Paginación URL State en Next.js (App Router):**
    *   La página del servidor recibe `searchParams` (`cursor`, `q`, `cursors`, `limit`).
    *   Para soportar navegación hacia atrás en Server Components, se mantiene una pila acumulativa de cursores separados por comas en la URL (`cursors=c1,c2,c3`).
    *   Avanzar agrega un cursor a la pila (`c1,c2,c3,c4`). Retroceder extrae el último cursor (`c1,c2`). Esto elimina la necesidad de estado del lado del cliente en el servidor y sobrevive a las recargas del navegador.

### B. Búsqueda y Proyección (`.select()`)
*   **Búsqueda Delegada a Algolia:** Si el parámetro de búsqueda `search` está presente, delegamos la consulta directamente a Algolia ([customerSearchService](file:///c:/Users/win11/Documents/workspace/moalv/yacco-nextjs/src/services/search/customerSearchService.ts)) y omitimos por completo el escaneo en Firestore.
*   **Proyección de Campos:** Para reducir el consumo de transferencia de red (egress) y velocidad de serialización en listados, el repositorio usa `.select()` para traer únicamente los campos requeridos por la tabla (excluyendo contactos de sedes y balances detallados que solo se cargan en la vista de perfil).

### C. Conteo de Documentos (Aggregations)
*   **Agregación Atómica:** Reemplazamos la estimación de páginas basada en el tamaño del array por la llamada a `getCountFromServer()` (a través de `.count().get()` en el SDK).
*   **Costo:** La agregación atómica en Firestore cobra **1 lectura de documento por cada 1000 documentos coincidentes**, en lugar de 1 lectura por cada documento individual.

### D. Eliminación de N+1 (Batch-Get y Denormalización)
Para vistas relacionales (ej. historial de ventas que muestra el nombre del cliente):
1.  **Denormalización:** Al registrar una venta, guardamos de forma redundante `customerName` y `customerAlias` dentro del documento de la venta.
2.  **Batch-Get (Ventas Históricas):** En lugar de realizar una consulta completa o un loop secuencial de gets, extraemos los `customerId` únicos de las ventas en la página activa y los resolvemos en lote en una única llamada mediante `getCustomersByIds` usando la cláusula `in`.

---

## 2. Guía de Replicación para Nuevas Entidades

Para replicar este patrón en otros listados grandes (como Pedidos `orders`, Ventas `sales` o Deudas `finance`):

### Paso 1: Agregar soporte paginado en el repositorio
Definir el método `listPaginated` en el repositorio respectivo usando el helper `paginate`:
```typescript
import { paginate } from "./_pagination";

async listPaginated(options: { pageSize: number; cursor?: string; filter?: string }) {
  const query = adminDb.collection("tu_coleccion")
    .orderBy("createdAt", "desc")
    .orderBy("__name__", "desc");

  return await paginate(
    query, 
    options, 
    ["createdAt", "id"], 
    (doc) => serializeFirestoreData({ id: doc.id, ...doc.data() })
  );
}
```

### Paso 2: Configurar searchParams en el Server Component (page.tsx)
Actualizar la ruta para recibir y procesar los cursores desde searchParams:
```typescript
interface PageProps {
  searchParams: Promise<{
    cursors?: string;
    limit?: string;
  }>;
}

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const cursorsParam = resolvedSearchParams.cursors || "";
  const limit = resolvedSearchParams.limit ? parseInt(resolvedSearchParams.limit, 10) : 10;
  
  const cursorArray = cursorsParam ? cursorsParam.split(",") : [];
  const currentCursor = cursorArray[cursorArray.length - 1];

  const paginatedResult = await tuRepository.listPaginated({
    pageSize: limit,
    cursor: currentCursor
  });
  
  // Renderizar la tabla pasando hasMore, nextCursor, currentCursors, y limit...
}
```

---

## 3. Estimación de Reducción de Lecturas y Costo

A continuación se muestra el impacto estimado tras la aplicación de este patrón en una base de datos con **21,000 clientes** e historial en producción:

| Operación / Carga de Página | Costo Anterior (Lecturas) | Costo Nuevo (Lecturas) | % Reducción de Lecturas |
| :--- | :--- | :--- | :--- |
| **Carga de Clientes (`/customers`)** | 21,000 lecturas | 10 (items) + 21 (Count Aggregation) = **31 lecturas** | **99.85%** |
| **Historial de Ventas (`/sales`)** | 21,000 lecturas (join de clientes) | 10 (ventas) + 10 (Batch-Get clientes) = **20 lecturas** | **99.90%** |
| **Búsqueda de Cliente** | 21,000 lecturas (filtro en memoria) | **0 lecturas** en Firestore (delegado a Algolia) | **100%** |
| **Carga de Catálogo de Productos** | Petición cruda a DB en cada req. | Cached en Vercel/Next.js (Revalidate largo) = **0 lecturas** | **100%** (en aciertos de caché) |
