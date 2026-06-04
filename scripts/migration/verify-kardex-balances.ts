// scripts/migration/verify-kardex-balances.ts
import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

const HOME = process.env.HOME || process.env.USERPROFILE || "";
const SA_PATH =
  process.env.NEW_SA_PATH ||
  path.resolve(HOME, "Desktop/claude-staging/keys/new-service-account.json");

if (!fs.existsSync(SA_PATH)) {
  console.error(`❌ No se encontró el archivo de credenciales de Firebase en: ${SA_PATH}`);
  process.exit(1);
}

const sa = JSON.parse(fs.readFileSync(SA_PATH, "utf8"));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function run() {
  console.log("=== INICIANDO AUDITORÍA DE KARDEX Y STOCKS MATERIALIZADOS (DRY-RUN) ===");
  
  const productsSnap = await db.collection("products").get();
  console.log(`Se encontraron ${productsSnap.size} productos en total.`);

  let discrepanciesCount = 0;

  for (const doc of productsSnap.docs) {
    const product = doc.data();
    const productId = doc.id;
    const name = product.name || "Sin nombre";
    const sku = product.sku || "Sin SKU";
    const currentFilled = product.stockFilled || 0;
    const currentEmpty = product.stockEmpty || 0;

    console.log(`\n------------------------------------------------------------`);
    console.log(`Producto: ${name} [SKU: ${sku}] (ID: ${productId})`);
    console.log(`Stock Materializado: LLENOS = ${currentFilled} | VACÍOS = ${currentEmpty}`);

    // Consultar todos los movimientos de Kardex históricos
    const kardexSnap = await db
      .collection("kardexLogs")
      .where("productId", "==", productId)
      .orderBy("createdAt", "asc")
      .get();

    console.log(`Movimientos en Kardex: ${kardexSnap.size}`);

    let computedFilled = 0;
    let computedEmpty = 0;

    kardexSnap.docs.forEach((kDoc) => {
      const log = kDoc.data();
      const qty = log.quantity || 0;
      const phase = log.phase;
      const type = log.type;

      if (phase === "FILLED") {
        if (type === "IN") {
          computedFilled += qty;
        } else if (type === "OUT") {
          computedFilled -= qty;
        }
      } else if (phase === "EMPTY") {
        if (type === "IN") {
          computedEmpty += qty;
        } else if (type === "OUT") {
          computedEmpty -= qty;
        }
      }
    });

    const diffFilled = currentFilled - computedFilled;
    const diffEmpty = currentEmpty - computedEmpty;

    console.log(`Stock Calculado por Logs: LLENOS = ${computedFilled} | VACÍOS = ${computedEmpty}`);

    if (diffFilled !== 0 || diffEmpty !== 0) {
      discrepanciesCount++;
      console.log(`⚠️ DISCREPANCIA DETECTADA en ${sku}:`);
      if (diffFilled !== 0) {
        console.log(`   Diferencia Llenos: Materializado (${currentFilled}) vs Calculado (${computedFilled}) = ${diffFilled}`);
      }
      if (diffEmpty !== 0) {
        console.log(`   Diferencia Vacíos: Materializado (${currentEmpty}) vs Calculado (${computedEmpty}) = ${diffEmpty}`);
      }
    } else {
      console.log(`✅ Stocks conciliados y consistentes con el historial de Kardex.`);
    }
  }

  console.log(`\n============================================================`);
  console.log(`AUDITORÍA FINALIZADA.`);
  console.log(`Productos con discrepancias: ${discrepanciesCount}`);
  console.log(`============================================================`);

  process.exit(0);
}

run().catch((e) => {
  console.error("❌ Error en la ejecución:", e);
  process.exit(1);
});
