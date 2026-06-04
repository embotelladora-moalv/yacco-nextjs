// transforms/cashMovements.ts  →  cashMovements
import { oldDb } from "../connections";
import { batchWrite, log, MigrationResult, tsToDate } from "../migrationHelpers";
import * as admin from "firebase-admin";

type OldPaymentReason = { id: string; name: string; type: string; isCalculated: boolean };

type OldDoc = {
  wayToPay: string;
  paymentReason: OldPaymentReason;
  rode: number;           // negativo = gasto, positivo = ingreso
  description?: string | null;
  distributionId?: string | null;
  uid?: string;
  bank?: string | null;
  timestamp?: admin.firestore.Timestamp;
  createdAt?: admin.firestore.Timestamp;
  updatedAt?: admin.firestore.Timestamp;
};

const PAYMENT_METHOD_MAP: Record<string, string> = {
  yape: "TRANSFER",
  plin: "TRANSFER",
  transfer: "TRANSFER",
  transferencia: "TRANSFER",
  bank: "TRANSFER",
  cash: "CASH",
  efectivo: "CASH",
  card: "CARD",
  tarjeta: "CARD",
};

export async function migrateCashMovements(
  dryRun: boolean
): Promise<MigrationResult> {
  const result: MigrationResult = {
    collection: "cashMovements → cashMovements",
    read: 0,
    written: 0,
    skipped: 0,
    errors: [],
  };

  log("Leyendo cashMovements...");
  const snap = await oldDb.collection("cashMovements").get();
  result.read = snap.size;

  const docs: Array<{ id: string; data: Record<string, unknown> }> = [];

  snap.forEach((doc) => {
    const d = doc.data() as OldDoc;
    const amount = Math.abs(d.rode ?? 0);
    const type = (d.rode ?? 0) >= 0 ? "INCOME" : "EXPENSE";
    const paymentMethod =
      PAYMENT_METHOD_MAP[d.wayToPay?.toLowerCase()] ?? "OTHER";

    const date =
      tsToDate(d.timestamp) ??
      tsToDate(d.createdAt) ??
      new Date();

    const entry: Record<string, unknown> = {
      type,
      categoryId: d.paymentReason?.id ?? "",
      categoryName: d.paymentReason?.name ?? "",
      amount,
      description: d.description ?? "",
      paymentMethod,
      date,
      legacyId: doc.id,
      createdAt:
        tsToDate(d.createdAt) ?? admin.firestore.FieldValue.serverTimestamp(),
      updatedAt:
        tsToDate(d.updatedAt) ?? admin.firestore.FieldValue.serverTimestamp(),
    };

    if (d.distributionId) entry.manifestId = d.distributionId;
    if (d.uid) entry.driverId = d.uid;

    docs.push({ id: doc.id, data: entry });
  });

  await batchWrite("cashMovements", docs, dryRun, result);
  return result;
}
