// transforms/products.ts  →  products
import { oldDb } from "../connections";
import { batchWrite, log, MigrationResult, tsToDate } from "../migrationHelpers";
import * as admin from "firebase-admin";

type OldBrand = { id: string; name: string };
type OldEnvase = { id: string; name: string; waterOutlet: string; brand: OldBrand };

type OldDoc = {
  name: string;
  type: string;                   // "product" | "envase"
  waterOutlet: string;            // "normal" | "spout" | "other"
  brand: OldBrand;
  envase?: OldEnvase | null;
  category?: { id: string; name: string } | null;
  active: boolean;
  isSale?: boolean;
  isSummary?: boolean;
  isReturnable?: boolean | null;
  distribution?: boolean;
  imageUrl?: string | null;
  cost?: number | null;
  stock: number;
  newDeliveryPrice?: number;
  newPlantPrice?: number;
  rechargeDeliveryPrice?: number;
  rechargePlantPrice?: number;
  createdAt?: admin.firestore.Timestamp;
  updatedAt?: admin.firestore.Timestamp;
  id?: string;
};

function toOperationalCategory(type: string): string {
  if (type === "envase") return "EMPTY_CONTAINER";
  return "FULL_PRODUCT";
}

function buildSku(type: string, waterOutlet: string, docId: string): string {
  const t = type === "envase" ? "E" : "P";
  const w = waterOutlet === "spout" ? "S" : waterOutlet === "other" ? "O" : "N";
  return `${t}-${w}-${docId.slice(0, 4).toUpperCase()}`;
}

export async function migrateProducts(
  dryRun: boolean
): Promise<MigrationResult> {
  const result: MigrationResult = {
    collection: "products → products",
    read: 0,
    written: 0,
    skipped: 0,
    errors: [],
  };

  log("Leyendo products...");
  const snap = await oldDb.collection("products").get();
  result.read = snap.size;

  const docs: Array<{ id: string; data: Record<string, unknown> }> = [];

  snap.forEach((doc) => {
    const d = doc.data() as OldDoc;
    const isEnvase = d.type === "envase";

    docs.push({
      id: doc.id,
      data: {
        name: d.name,
        sku: buildSku(d.type, d.waterOutlet, doc.id),
        operationalCategory: toOperationalCategory(d.type),
        packagingType: "BIDON_20L",   // placeholder — revisar manualmente
        isMaquila: false,
        brandName: d.brand?.name ?? null,
        volumeCapacity: 20,
        unitOfMeasure: "L",
        hasTap: d.waterOutlet === "spout",
        isReturnableContainer: d.isReturnable ?? false,

        // Precios: usamos precio de planta como referencia (ver MAPEO.md)
        priceFull: d.newPlantPrice ?? d.newDeliveryPrice ?? 0,
        priceRefill: d.rechargePlantPrice ?? d.rechargeDeliveryPrice ?? 0,
        priceEmpty: 0,

        // Stock: separado por tipo
        stockFilled: isEnvase ? 0 : (d.stock ?? 0),
        stockEmpty: isEnvase ? (d.stock ?? 0) : 0,

        isActive: d.active ?? true,
        legacyId: doc.id,

        // Referencia al envase asociado (si es un producto lleno)
        legacyEnvaseId: d.envase?.id ?? null,

        createdAt:
          tsToDate(d.createdAt) ?? admin.firestore.FieldValue.serverTimestamp(),
        updatedAt:
          tsToDate(d.updatedAt) ?? admin.firestore.FieldValue.serverTimestamp(),
      },
    });
  });

  await batchWrite("products", docs, dryRun, result);
  return result;
}
