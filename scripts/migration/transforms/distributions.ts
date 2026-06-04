// transforms/distributions.ts  →  dispatchManifests
import { oldDb } from "../connections";
import {
  batchWrite,
  log,
  MigrationResult,
  numericObjectToArray,
  tsToDate,
  tsToDateOrNow,
} from "../migrationHelpers";
import * as admin from "firebase-admin";

type OldProduct = {
  id: string;
  name: string;
  waterOutlet?: string;
  type?: string;
  brand?: { id: string; name: string };
  envase?: { id: string; name: string; waterOutlet?: string } | null;
  isSale?: boolean;
  isSummary?: boolean;
};

type OldMovement = {
  product: OldProduct;
  quantity: number;
  quantityCurrent?: number;
  date?: admin.firestore.Timestamp;
  dateBatch?: admin.firestore.Timestamp;
  codeBatch?: string;
  description?: string;
  id?: string;
  isSale?: boolean;
  isChange?: boolean;
  isUseless?: boolean;
  isDistribution?: boolean;
  price?: number;
  timestamp?: admin.firestore.Timestamp;
  uid?: string;
  quantityBatch?: number;
};

type OldDoc = {
  openingDate: admin.firestore.Timestamp;
  deadline?: admin.firestore.Timestamp | null;
  status: string;           // "closed" | "process"
  initialRode?: number | null;
  observation?: string | null;
  user: { id: string; name: string };
  vehicle: { id: string; licensePlate: string; name: string };
  uid: string;
  createdAt?: admin.firestore.Timestamp | null;
  updatedAt?: admin.firestore.Timestamp | null;
  movements?: Record<string, OldMovement>;
};

function isDispatchOut(m: OldMovement): boolean {
  const desc = m.description ?? "";
  return (
    desc.includes("Salida") ||
    m.isDistribution === true ||
    (m.isSale === false && !m.quantityCurrent)
  );
}

function isEnvaseReturn(m: OldMovement): boolean {
  const desc = m.description ?? "";
  return (
    desc.includes("Devolución de envase") &&
    typeof m.quantityCurrent === "number"
  );
}

function toStatus(old: string): string {
  if (old === "closed") return "LIQUIDATED";
  if (old === "process") return "ON_ROUTE";
  return "PENDING";
}

export async function migrateDistributions(
  dryRun: boolean
): Promise<MigrationResult> {
  const result: MigrationResult = {
    collection: "distributions → dispatchManifests",
    read: 0,
    written: 0,
    skipped: 0,
    errors: [],
  };

  log("Leyendo distributions...");
  const snap = await oldDb.collection("distributions").get();
  result.read = snap.size;

  const docs: Array<{ id: string; data: Record<string, unknown> }> = [];

  snap.forEach((doc) => {
    const d = doc.data() as OldDoc;
    const movements = numericObjectToArray<OldMovement>(d.movements ?? {});

    // Separar movimientos en items (carga al camión) y devoluciones de envases
    const items: Record<string, unknown>[] = [];
    const returnedEmpties: Record<string, unknown>[] = [];

    movements.forEach((m) => {
      if (!m?.product?.id) return;

      if (isEnvaseReturn(m)) {
        returnedEmpties.push({
          productId: m.product.id,
          quantityReturned: Math.abs(m.quantity),
          codeBatch: m.codeBatch ?? null,
        });
      } else if (isDispatchOut(m)) {
        items.push({
          productId: m.product.id,
          lotNumber: m.codeBatch ?? "",
          quantityLoaded: Math.abs(m.quantity),
          quantitySold: 0,          // se calculará desde vouchers
          quantityReturnedFull: 0,
          wasteQuantity: 0,
          unitPrice: m.price ?? 0,
        });
      }
      // isUseless → KardexLog (no va en el manifest)
    });

    const dispatchDate = d.openingDate;
    const createdAt = tsToDate(d.createdAt) ?? tsToDate(dispatchDate) ?? new Date();

    docs.push({
      id: doc.id,
      data: {
        manifestNumber: `DESP-${doc.id.padStart(6, "0")}`,
        driverId: d.user?.id ?? d.uid,
        dispatcherId: d.uid,
        truckPlate: d.vehicle?.licensePlate ?? "",
        dispatchDate: tsToDate(dispatchDate) ?? new Date(),
        liquidationDate: tsToDate(d.deadline ?? undefined) ?? null,
        status: toStatus(d.status),
        items,
        returnedEmpties,
        initialPettyCash: d.initialRode ?? null,
        cashExpected: 0,
        cashReported: 0,
        digitalPaymentsExpected: 0,
        digitalPaymentsReported: 0,
        notes: d.observation ?? null,
        legacyId: doc.id,
        createdAt,
        updatedAt: tsToDate(d.updatedAt ?? undefined) ?? createdAt,
      },
    });
  });

  await batchWrite("dispatchManifests", docs, dryRun, result);
  return result;
}
