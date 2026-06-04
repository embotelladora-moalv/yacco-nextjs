// transforms/paymentReasons.ts  →  finance_categories
import { oldDb } from "../connections";
import { batchWrite, log, MigrationResult, tsToDate } from "../migrationHelpers";
import * as admin from "firebase-admin";

type OldDoc = {
  name: string;
  type: string;           // "expense" | "income"
  isCalculated: boolean;
  createdAt?: admin.firestore.Timestamp;
  updatedAt?: admin.firestore.Timestamp;
};

export async function migratePaymentReasons(
  dryRun: boolean
): Promise<MigrationResult> {
  const result: MigrationResult = {
    collection: "paymentReasons → finance_categories",
    read: 0,
    written: 0,
    skipped: 0,
    errors: [],
  };

  log("Leyendo paymentReasons...");
  const snap = await oldDb.collection("paymentReasons").get();
  result.read = snap.size;

  const docs: Array<{ id: string; data: Record<string, unknown> }> = [];

  snap.forEach((doc) => {
    const d = doc.data() as OldDoc;
    docs.push({
      id: doc.id,
      data: {
        name: d.name,
        type: d.type === "income" ? "INCOME" : "EXPENSE",
        isActive: true,
        legacyId: doc.id,
        createdAt:
          tsToDate(d.createdAt) ?? admin.firestore.FieldValue.serverTimestamp(),
      },
    });
  });

  await batchWrite("finance_categories", docs, dryRun, result);
  return result;
}
