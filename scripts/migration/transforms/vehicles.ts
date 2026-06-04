// transforms/vehicles.ts  →  trucks
import { oldDb } from "../connections";
import { batchWrite, log, MigrationResult } from "../migrationHelpers";
import * as admin from "firebase-admin";

type OldDoc = {
  name: string;
  licensePlate: string;
  isBusy: boolean;
};

export async function migrateVehicles(
  dryRun: boolean
): Promise<MigrationResult> {
  const result: MigrationResult = {
    collection: "vehicles → trucks",
    read: 0,
    written: 0,
    skipped: 0,
    errors: [],
  };

  log("Leyendo vehicles...");
  const snap = await oldDb.collection("vehicles").get();
  result.read = snap.size;

  const docs: Array<{ id: string; data: Record<string, unknown> }> = [];

  snap.forEach((doc) => {
    const d = doc.data() as OldDoc;
    docs.push({
      id: doc.id,
      data: {
        plateNumber: d.licensePlate,
        alias: d.name,
        capacity: 0,        // sin dato en sistema viejo — revisar manualmente
        isActive: true,
        legacyId: doc.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    });
  });

  await batchWrite("trucks", docs, dryRun, result);
  return result;
}
