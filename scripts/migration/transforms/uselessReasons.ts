// transforms/uselessReasons.ts  →  shrinkage_reasons
import { oldDb } from "../connections";
import { batchWrite, log, MigrationResult, tsToDate } from "../migrationHelpers";
import * as admin from "firebase-admin";

type OldDoc = {
  name: string;
  type: string;   // "product" | "envase"
  createdAt?: admin.firestore.Timestamp;
  updatedAt?: admin.firestore.Timestamp;
  id?: string;
};

export async function migrateUselessReasons(
  dryRun: boolean
): Promise<MigrationResult> {
  const result: MigrationResult = {
    collection: "uselessReasons → shrinkage_reasons",
    read: 0,
    written: 0,
    skipped: 0,
    errors: [],
  };

  log("Leyendo uselessReasons...");
  const snap = await oldDb.collection("uselessReasons").get();
  result.read = snap.size;

  const docs: Array<{ id: string; data: Record<string, unknown> }> = [];

  snap.forEach((doc) => {
    const d = doc.data() as OldDoc;
    docs.push({
      id: doc.id,
      data: {
        name: d.name,
        affectsPhase: d.type === "envase" ? "EMPTY" : "FILLED",
        isActive: true,
        legacyId: doc.id,
        createdAt:
          tsToDate(d.createdAt) ?? admin.firestore.FieldValue.serverTimestamp(),
        updatedAt:
          tsToDate(d.updatedAt) ?? admin.firestore.FieldValue.serverTimestamp(),
      },
    });
  });

  await batchWrite("shrinkage_reasons", docs, dryRun, result);
  return result;
}
