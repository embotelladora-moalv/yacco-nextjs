// transforms/movements.ts  →  kardex_logs
import { oldDb } from "../connections";
import { batchWrite, log, MigrationResult, tsToDate } from "../migrationHelpers";
import * as admin from "firebase-admin";

type OldProduct = {
  id: string;
  name: string;
  type?: string;          // "product" | "envase"
  waterOutlet?: string;
  brand?: { id: string; name: string };
  envase?: unknown;
  isSale?: boolean;
  isSummary?: boolean;
};

type OldDoc = {
  date?: admin.firestore.Timestamp;
  dateBatch?: admin.firestore.Timestamp;
  codeBatch?: string;
  quantity: number;
  price?: number;
  product: OldProduct;
  description?: string;
  isDistribution?: boolean;
  timestamp?: admin.firestore.Timestamp;
  uid?: string | null;
  isSale?: boolean;
  isChange?: boolean;
  isUseless?: boolean;
};

function toPhase(product: OldProduct): string {
  return product.type === "envase" ? "EMPTY" : "FILLED";
}

function toReferenceType(d: OldDoc): string {
  if (d.isUseless) return "SHRINKAGE";
  if (d.isChange) return "RETURN";
  if (d.isDistribution || d.isSale) return "SALE";
  return "PURCHASE";
}

export async function migrateMovements(
  dryRun: boolean
): Promise<MigrationResult> {
  const result: MigrationResult = {
    collection: "movements → kardex_logs",
    read: 0,
    written: 0,
    skipped: 0,
    errors: [],
  };

  log("Leyendo movements...");
  const snap = await oldDb.collection("movements").get();
  result.read = snap.size;

  const docs: Array<{ id: string; data: Record<string, unknown> }> = [];

  snap.forEach((doc) => {
    const d = doc.data() as OldDoc;
    if (!d.product?.id) {
      result.skipped++;
      return;
    }

    const qty = d.quantity ?? 0;
    docs.push({
      id: doc.id,
      data: {
        productId: d.product.id,
        type: qty >= 0 ? "IN" : "OUT",
        phase: toPhase(d.product),
        quantity: Math.abs(qty),
        referenceId: d.codeBatch ?? doc.id,
        referenceType: toReferenceType(d),
        // previousStock y newStock no existían — se dejan en 0
        previousStock: 0,
        newStock: 0,
        description: d.description ?? null,
        createdBy: d.uid ?? null,
        legacyId: doc.id,
        createdAt:
          tsToDate(d.timestamp) ??
          tsToDate(d.date) ??
          admin.firestore.FieldValue.serverTimestamp(),
      },
    });
  });

  await batchWrite("kardex_logs", docs, dryRun, result);
  return result;
}
