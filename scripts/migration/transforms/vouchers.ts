// transforms/vouchers.ts  →  sales
import { oldDb } from "../connections";
import {
  batchWrite,
  log,
  MigrationResult,
  numericObjectToArray,
  tsToDate,
} from "../migrationHelpers";
import * as admin from "firebase-admin";

type OldMovement = {
  id?: string;
  product: { id: string; name: string; type?: string; waterOutlet?: string };
  quantity: number;
  price: number;
  isSale?: boolean;
  date?: admin.firestore.Timestamp;
  dateBatch?: admin.firestore.Timestamp;
  codeBatch?: string;
  description?: string;
};

type OldEnvaseEntry = {
  product: { id: string; name: string };
  quantity: number;
  quantityCurrent?: number;
  date?: admin.firestore.Timestamp;
  dateBatch?: admin.firestore.Timestamp;
  codeBatch?: string;
  description?: string;
};

type OldCustomer = {
  id: string;
  name: string;
  phone?: string;
  coordenada?: string;
  reference?: string | null;
  image?: string | null;
  category?: { id: string; name: string };
};

type OldDoc = {
  date: admin.firestore.Timestamp;
  createdAt?: admin.firestore.Timestamp | null;
  updatedAt?: admin.firestore.Timestamp | null;
  updateAt?: admin.firestore.Timestamp;   // typo del campo original
  customer: OldCustomer;
  origin?: string;
  address?: string;
  reference?: string | null;
  totalPaid?: number | null;
  total: number;
  observation?: string | null;
  uid?: string;
  totalDrumsNormal?: number;
  totalDrumsSpout?: number;
  totalDrumsOther?: number;
  movements?: Record<string, OldMovement>;
  envases?: Record<string, OldEnvaseEntry>;
  type?: string;
  paymentType?: string;
  status?: string;
  debtPaid?: number;
  isPaid?: boolean;
  dateProcess?: admin.firestore.Timestamp;
};

const PAYMENT_MAP: Record<string, string> = {
  cash: "CASH",
  efectivo: "CASH",
  credit: "CREDIT",
  credito: "CREDIT",
  yape: "TRANSFER",
  transfer: "TRANSFER",
};

export async function migrateVouchers(
  dryRun: boolean
): Promise<MigrationResult> {
  const result: MigrationResult = {
    collection: "vouchers → sales",
    read: 0,
    written: 0,
    skipped: 0,
    errors: [],
  };

  log("Leyendo vouchers...");
  const snap = await oldDb.collection("vouchers").get();
  result.read = snap.size;

  const docs: Array<{ id: string; data: Record<string, unknown> }> = [];

  snap.forEach((doc) => {
    const d = doc.data() as OldDoc;

    const movements = numericObjectToArray<OldMovement>(d.movements ?? {});
    const envaseEntries = numericObjectToArray<OldEnvaseEntry>(d.envases ?? {});

    const items = movements
      .filter((m) => m?.product?.id)
      .map((m) => ({
        productId: m.product.id,
        quantity: Math.abs(m.quantity),
        unitPrice: m.price ?? 0,
        lotNumber: m.codeBatch ?? null,
      }));

    const returnedContainers = envaseEntries
      .filter((e) => e?.product?.id)
      .map((e) => ({
        productId: e.product.id,
        quantityReturned: e.quantity ?? 0,
      }));

    const saleDate = tsToDate(d.date) ?? new Date();
    const updatedAt =
      tsToDate(d.updateAt) ??
      tsToDate(d.updatedAt ?? undefined) ??
      saleDate;

    docs.push({
      id: doc.id,
      data: {
        customerId: d.customer?.id ?? "",
        manifestId: d.origin ?? null,        // origin = ID del distribution viejo
        address: d.address ?? "",
        reference: d.reference ?? null,
        items,
        returnedContainers,
        totalAmount: d.total ?? 0,
        paidAmount: d.totalPaid ?? d.debtPaid ?? 0,
        isPaid: d.isPaid ?? false,
        paymentMethod: PAYMENT_MAP[d.paymentType?.toLowerCase() ?? ""] ?? "OTHER",
        observation: d.observation ?? null,
        status: "DELIVERED",
        createdBy: d.uid ?? "",
        date: saleDate,
        dateProcess: tsToDate(d.dateProcess ?? undefined) ?? null,
        legacyId: doc.id,
        createdAt: tsToDate(d.createdAt ?? undefined) ?? saleDate,
        updatedAt,
      },
    });
  });

  await batchWrite("sales", docs, dryRun, result);
  return result;
}
