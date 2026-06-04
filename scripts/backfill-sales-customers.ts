// scripts/backfill-sales-customers.ts
import * as admin from "firebase-admin";

const isEmulator = process.env.FIRESTORE_EMULATOR_HOST;

if (!admin.apps.length) {
  admin.initializeApp({
    ...(isEmulator
      ? { projectId: process.env.FIREBASE_PROJECT_ID || "demo-project" }
      : {
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
          }),
        }),
  });
}

const db = admin.firestore();

async function backfillSalesCustomers() {
  const dryRun = process.env.DRY_RUN !== "false";
  console.log(`Starting backfill. DRY_RUN = ${dryRun}`);

  const salesSnapshot = await db.collection("sales").get();
  console.log(`Found ${salesSnapshot.size} total sales documents.`);

  let processedCount = 0;
  let updatedCount = 0;
  let missingCustomerCount = 0;

  // Cache para no volver a consultar el mismo cliente en cada venta
  const customerCache: Record<string, { name: string; alias: string } | null> = {};

  for (const doc of salesSnapshot.docs) {
    const sale = doc.data();
    processedCount++;

    // Si ya tiene el customerName denormalizado, omitimos
    if (sale.customerName && sale.customerAlias !== undefined) {
      continue;
    }

    const customerId = sale.customerId;
    if (!customerId) {
      console.warn(`[Warning] Sale ${doc.id} does not have customerId.`);
      continue;
    }

    // Obtener info del cliente (con cache)
    if (customerCache[customerId] === undefined) {
      const customerDoc = await db.collection("customers").doc(customerId).get();
      if (customerDoc.exists) {
        const custData = customerDoc.data();
        customerCache[customerId] = {
          name: custData?.name || "Cliente Desconocido",
          alias: custData?.alias || "",
        };
      } else {
        customerCache[customerId] = null;
      }
    }

    const customerInfo = customerCache[customerId];
    if (!customerInfo) {
      missingCustomerCount++;
      console.warn(`[Warning] Customer ${customerId} for sale ${doc.id} not found in database.`);
      continue;
    }

    updatedCount++;
    console.log(`[Update] Sale ${doc.id} ➔ Customer: "${customerInfo.name}", Alias: "${customerInfo.alias}"`);

    if (!dryRun) {
      await doc.ref.update({
        customerName: customerInfo.name,
        customerAlias: customerInfo.alias,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  console.log("\n--- BACKFILL COMPLETED ---");
  console.log(`Total processed sales: ${processedCount}`);
  console.log(`Sales needing update: ${updatedCount}`);
  console.log(`Sales with missing customer DB docs: ${missingCustomerCount}`);
  console.log(`DRY_RUN was: ${dryRun}`);
  if (dryRun && updatedCount > 0) {
    console.log("No changes were written. Set env var DRY_RUN=false to execute actual updates.");
  }
}

backfillSalesCustomers()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  });
