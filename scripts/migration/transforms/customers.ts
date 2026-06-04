// transforms/customers.ts  →  customers
import { oldDb } from "../connections";
import { batchWrite, log, MigrationResult, numericObjectToArray, tsToDate } from "../migrationHelpers";
import * as admin from "firebase-admin";

type OldEnvaseEntry = {
  product: { id: string; name: string; waterOutlet: string };
  quantity: number;
};

type OldDoc = {
  type: string;                   // "person" | "company"
  identity?: string;
  name: string;
  phone?: string;
  city?: string;
  district?: string | null;
  address?: string;
  reference?: string | null;
  coordenada?: string | null;     // URL de Google Maps
  debt?: number;
  category?: { id: string; name: string } | null;
  priceReference?: string | null;
  envases?: Record<string, OldEnvaseEntry> | null;
  createdAt?: admin.firestore.Timestamp;
  updatedAt?: admin.firestore.Timestamp;
};

export async function migrateCustomers(
  dryRun: boolean
): Promise<MigrationResult> {
  const result: MigrationResult = {
    collection: "customers → customers",
    read: 0,
    written: 0,
    skipped: 0,
    errors: [],
  };

  log("Leyendo customers...");
  const snap = await oldDb.collection("customers").get();
  result.read = snap.size;

  const docs: Array<{ id: string; data: Record<string, unknown> }> = [];

  snap.forEach((doc) => {
    const d = doc.data() as OldDoc;

    // Construir locations[0] con la dirección principal
    const location: Record<string, unknown> = {
      id: `loc-${doc.id}`,
      name: "Principal",
      address: d.address ?? "",
      isDefault: true,
    };
    if (d.reference) location.reference = d.reference;
    // coordenada es URL de Google Maps — no parseable; se preserva como nota
    if (d.coordenada) location.locationUrl = d.coordenada;

    // loanedItems: { [productId]: quantity }
    const loanedItems: Record<string, number> = {};
    if (d.envases) {
      const entries = numericObjectToArray<OldEnvaseEntry>(d.envases);
      entries.forEach((e) => {
        if (e?.product?.id && e.quantity) {
          loanedItems[e.product.id] = (loanedItems[e.product.id] ?? 0) + e.quantity;
        }
      });
    }

    // tags desde categoria
    const tags: string[] = [];
    if (d.category?.name) tags.push(d.category.name);

    // contacts: el teléfono principal como contacto
    const contacts: Record<string, unknown>[] = [];
    if (d.phone) {
      contacts.push({
        id: `contact-${doc.id}`,
        name: d.name,
        phone: d.phone,
        role: "Principal",
      });
    }

    docs.push({
      id: doc.id,
      data: {
        type: d.type === "company" ? "COMPANY" : "INDIVIDUAL",
        documentId: d.identity ?? "",
        name: d.name,
        phone: d.phone ?? "",
        tags,
        locations: [location],
        contacts,
        debtAmount: d.debt ?? 0,
        loanedItems,
        customPrices: {},
        isActive: true,
        legacyId: doc.id,
        legacyCategoryId: d.category?.id ?? null,
        createdAt:
          tsToDate(d.createdAt) ?? admin.firestore.FieldValue.serverTimestamp(),
        updatedAt:
          tsToDate(d.updatedAt) ?? admin.firestore.FieldValue.serverTimestamp(),
      },
    });
  });

  await batchWrite("customers", docs, dryRun, result);
  return result;
}
