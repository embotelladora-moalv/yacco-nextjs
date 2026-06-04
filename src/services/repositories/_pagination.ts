import admin from "firebase-admin";

function deserializeValue(val: any) {
  if (val && typeof val === "object" && typeof val._seconds === "number") {
    return new admin.firestore.Timestamp(val._seconds, val._nanoseconds);
  }
  return val;
}

export function serializeCursor(values: any[]): string {
  return Buffer.from(JSON.stringify(values)).toString("base64");
}

export function deserializeCursor(cursorStr: string): any[] {
  try {
    const decoded = Buffer.from(cursorStr, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded);
    return parsed.map(deserializeValue);
  } catch (error) {
    console.error("Error decoding cursor:", error);
    return [];
  }
}

export interface PaginationOptions {
  pageSize: number;
  cursor?: string;
}

export interface PaginatedResult<R> {
  items: R[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Realiza una consulta paginada utilizando cursor (startAfter) en Firestore.
 * 
 * @param query Consulta base de Firestore
 * @param options Opciones de paginación (pageSize, cursor)
 * @param orderByFields Array de campos por los que está ordenada la consulta (en el mismo orden)
 * @param mapper Función para transformar cada documento QueryDocumentSnapshot a la entidad correspondiente
 */
export async function paginate<R>(
  query: admin.firestore.Query,
  options: PaginationOptions,
  orderByFields: string[],
  mapper: (doc: admin.firestore.QueryDocumentSnapshot) => R
): Promise<PaginatedResult<R>> {
  const { pageSize, cursor } = options;
  let q = query.limit(pageSize + 1);

  if (cursor) {
    const cursorValues = deserializeCursor(cursor);
    if (cursorValues.length > 0) {
      q = q.startAfter(...cursorValues);
    }
  }

  const snapshot = await q.get();
  const docs = snapshot.docs;
  const hasMore = docs.length > pageSize;
  const itemsDocs = hasMore ? docs.slice(0, pageSize) : docs;

  const items = itemsDocs.map(mapper);

  let nextCursor: string | null = null;
  if (itemsDocs.length > 0) {
    const lastDoc = itemsDocs[itemsDocs.length - 1];
    const nextCursorValues = orderByFields.map((field) => {
      if (field === "id" || field === "__name__") {
        return lastDoc.id;
      }
      return lastDoc.data()[field];
    });
    nextCursor = serializeCursor(nextCursorValues);
  }

  return {
    items,
    nextCursor,
    hasMore,
  };
}
