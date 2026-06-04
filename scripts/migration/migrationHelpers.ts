// scripts/migration/migrationHelpers.ts
import * as admin from "firebase-admin";
import { newDb } from "./connections";

export interface MigrationResult {
  collection: string;
  read: number;
  written: number;
  skipped: number;
  errors: string[];
}

// Escribe documentos en lotes de 500 (límite de Firestore).
// Si dryRun=true, solo loggea sin escribir.
export async function batchWrite(
  collectionName: string,
  docs: Array<{ id: string; data: Record<string, unknown> }>,
  dryRun: boolean,
  result: MigrationResult
): Promise<void> {
  const BATCH_SIZE = 400;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const chunk = docs.slice(i, i + BATCH_SIZE);
    if (dryRun) {
      result.written += chunk.length;
      chunk.forEach((d) => console.log(`  [DRY] ${collectionName}/${d.id}`));
    } else {
      const batch = newDb.batch();
      chunk.forEach(({ id, data }) => {
        const ref = newDb.collection(collectionName).doc(id);
        batch.set(ref, data, { merge: false });
      });
      await batch.commit();
      result.written += chunk.length;
      console.log(
        `  ✓ ${collectionName}: escritos ${result.written}/${result.read}`
      );
    }
  }
}

// Convierte un objeto con claves numéricas ({ "0": ..., "1": ... }) a array.
export function numericObjectToArray<T>(obj: unknown): T[] {
  if (!obj || typeof obj !== "object") return [];
  return Object.keys(obj as Record<string, T>)
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => (obj as Record<string, T>)[k]);
}

// Convierte un Timestamp de Firestore a Date, o retorna undefined si es null/undefined.
export function tsToDate(
  val: admin.firestore.Timestamp | null | undefined
): Date | undefined {
  if (!val) return undefined;
  return val.toDate();
}

export function tsToDateOrNow(
  val: admin.firestore.Timestamp | null | undefined,
  fallback?: admin.firestore.Timestamp | null
): Date {
  return (
    tsToDate(val) ?? tsToDate(fallback ?? undefined) ?? new Date()
  );
}

export function log(msg: string) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}
