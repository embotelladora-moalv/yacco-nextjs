import { Timestamp } from "firebase-admin/firestore";

/**
 * Recursively converts Firestore Timestamps to ISO strings in an object.
 * This is essential for passing data from Server Components to Client Components in Next.js,
 * as plain objects cannot contain non-serializable classes like Timestamp.
 */
export function serializeFirestoreData(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  // Si es un Timestamp de Firebase (tiene la función toDate)
  if (typeof obj.toDate === "function") {
    return obj.toDate().toISOString();
  }

  // Si parece un Timestamp serializado (el caso que reportó el usuario)
  // { _seconds: number, _nanoseconds: number }
  if (
    typeof obj === "object" &&
    obj !== null &&
    typeof obj._seconds === "number" &&
    typeof obj._nanoseconds === "number"
  ) {
    return new Date(obj._seconds * 1000).toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => serializeFirestoreData(item));
  }

  if (typeof obj === "object") {
    const serialized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      serialized[key] = serializeFirestoreData(value);
    }
    return serialized;
  }

  return obj;
}
