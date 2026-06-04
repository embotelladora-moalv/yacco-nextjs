// transforms/users.ts  →  users
import { oldDb } from "../connections";
import { batchWrite, log, MigrationResult } from "../migrationHelpers";
import * as admin from "firebase-admin";

type OldDoc = {
  name: string;
  email: string;
  role: string;   // "distributor" en todos los casos observados
  active: boolean;
  isBusy: boolean;
};

const ROLE_MAP: Record<string, string> = {
  distributor: "DRIVER",
  admin: "ADMIN",
  sales: "SALES",
  production: "PRODUCTION",
  assistant: "ASSISTANT",
};

export async function migrateUsers(dryRun: boolean): Promise<MigrationResult> {
  const result: MigrationResult = {
    collection: "users → users",
    read: 0,
    written: 0,
    skipped: 0,
    errors: [],
  };

  log("Leyendo users...");
  const snap = await oldDb.collection("users").get();
  result.read = snap.size;

  const docs: Array<{ id: string; data: Record<string, unknown> }> = [];

  snap.forEach((doc) => {
    const d = doc.data() as OldDoc;
    const mappedRole = ROLE_MAP[d.role] ?? "DRIVER";
    docs.push({
      id: doc.id,
      data: {
        name: d.name,
        email: d.email,
        roles: [mappedRole],
        isActive: d.active ?? true,
        legacyId: doc.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    });
  });

  await batchWrite("users", docs, dryRun, result);
  return result;
}
