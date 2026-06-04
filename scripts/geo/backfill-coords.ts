// scripts/geo/backfill-coords.ts
//
// FASE 2: PARSEO Y BACKFILL DE COORDENADAS
// Parsea URLs de Google Maps (incluyendo resolución de acortados) y actualiza
// el campo latitude, longitude, geoSource y geoStatus de la ubicación del cliente.
//
// Uso (Dry-run por defecto):
//   NEW_SA_PATH=/ruta/nuevo-service-account.json npx ts-node \
//     --project scripts/migration/tsconfig.scripts.json \
//     scripts/geo/backfill-coords.ts
//
// Uso (Commit real en BD):
//   NEW_SA_PATH=/ruta/nuevo-service-account.json npx ts-node \
//     --project scripts/migration/tsconfig.scripts.json \
//     scripts/geo/backfill-coords.ts --commit
//
// Parámetros adicionales:
//   --force: Vuelve a procesar clientes que ya tengan coordenadas válidas.

import { newDb } from "../migration/connections";
import { parseMapsLink, isInPeru, isValidCoordinates } from "../../src/lib/geo/parseMapsLink";
import * as fs from "fs";
import * as path from "path";

const args = process.argv.slice(2);
const commit = args.includes("--commit");
const force = args.includes("--force");

const CACHE_PATH = path.resolve(__dirname, "resolved-urls-cache.json");

// Cargar cache
let urlCache: Record<string, string> = {};
if (fs.existsSync(CACHE_PATH)) {
  try {
    urlCache = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
  } catch (e) {
    console.error("No se pudo leer la caché, inicializando nueva.", e);
  }
}

function saveCache() {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(urlCache, null, 2), "utf8");
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Resuelve una URL corta siguiendo los redireccionamientos HTTP (GET para asegurar redirección).
 */
async function resolveShortUrl(shortUrl: string, maxRedirects = 3): Promise<string | null> {
  let currentUrl = shortUrl;
  
  for (let i = 0; i < maxRedirects; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    try {
      const res = await fetch(currentUrl, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const location = res.headers.get("location");
      if (location) {
        // Puede ser ruta relativa
        currentUrl = new URL(location, currentUrl).toString();
      } else {
        // Llegamos al destino final o no redirigió
        break;
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  return currentUrl;
}

/**
 * Resuelve una URL corta con reintentos y retroceso exponencial (backoff).
 */
async function resolveShortUrlWithRetry(url: string, retries = 3, baseDelay = 1000): Promise<string | null> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await resolveShortUrl(url);
    } catch (err: any) {
      if (attempt === retries - 1) {
        console.error(`\nError al resolver URL corta ${url} tras ${retries} intentos: ${err.message}`);
        return null;
      }
      const backoffDelay = baseDelay * Math.pow(2, attempt);
      await delay(backoffDelay);
    }
  }
  return null;
}

async function run() {
  console.log("=== INICIANDO BACKFILL DE COORDENADAS ===");
  console.log(`Modo: ${commit ? "🔥 COMMIT REAL" : "🔍 DRY-RUN (Solo lectura)"}`);
  console.log(`Ignorar coords existentes (--force): ${force ? "Sí" : "No"}`);

  const customersSnap = await newDb.collection("customers").get();
  const total = customersSnap.size;
  console.log(`Se encontraron ${total} clientes.`);

  let processed = 0;
  let skippedAlreadyHasCoords = 0;
  let noUrlCount = 0;
  let resolvedShortCount = 0;
  let failedResolveCount = 0;
  let parsedOkCount = 0;
  let parsedUnparseableCount = 0;
  let parsedOutOfRangeCount = 0;

  const updates: Array<{ id: string; locations: any[] }> = [];

  // Recorrer secuencialmente para respetar el rate limit de 5 peticiones/seg
  for (const doc of customersSnap.docs) {
    processed++;
    const customer = doc.data();
    const locations = customer.locations || [];
    
    // Encontrar loc principal
    let locIndex = locations.findIndex((l: any) => l.isDefault);
    if (locIndex === -1 && locations.length > 0) {
      locIndex = 0;
    }

    const currentLoc = locIndex !== -1 ? locations[locIndex] : null;

    // Verificar si ya tiene coordenadas válidas y no se especificó --force
    if (
      !force &&
      currentLoc &&
      typeof currentLoc.latitude === "number" &&
      typeof currentLoc.longitude === "number" &&
      isValidCoordinates(currentLoc.latitude, currentLoc.longitude)
    ) {
      skippedAlreadyHasCoords++;
      continue;
    }

    // Buscar el link en locationUrl o url
    let mapUrl: string | null = null;
    if (currentLoc) {
      mapUrl = currentLoc.locationUrl || currentLoc.url || null;
    }

    if (!mapUrl && customer.coordenada) {
      mapUrl = customer.coordenada;
    }

    if (!mapUrl) {
      noUrlCount++;
      continue;
    }

    mapUrl = mapUrl.trim();

    // Determinar si es corta o larga
    const isShort = /maps\.app\.goo\.gl|goo\.gl\/maps/i.test(mapUrl);

    let longUrl: string | null = null;
    let geoSource: "inline" | "redirect" = "inline";

    if (isShort) {
      geoSource = "redirect";
      if (urlCache[mapUrl]) {
        longUrl = urlCache[mapUrl];
      } else {
        // Rate limit: 200ms entre peticiones (5 req/seg máximo)
        await delay(200);
        const resolved = await resolveShortUrlWithRetry(mapUrl);
        if (resolved) {
          longUrl = resolved;
          urlCache[mapUrl] = resolved;
          resolvedShortCount++;
          saveCache();
        } else {
          failedResolveCount++;
        }
      }
    } else {
      longUrl = mapUrl;
    }

    if (!longUrl) {
      // Registrar error de resolución
      if (locIndex !== -1) {
        const updatedLocs = [...locations];
        updatedLocs[locIndex] = {
          ...updatedLocs[locIndex],
          geoSource,
          geoStatus: "UNPARSEABLE",
        };
        updates.push({ id: doc.id, locations: updatedLocs });
      }
      parsedUnparseableCount++;
      continue;
    }

    // Parsear coordenadas del URL largo
    const parsed = parseMapsLink(longUrl);

    if (!parsed) {
      if (locIndex !== -1) {
        const updatedLocs = [...locations];
        updatedLocs[locIndex] = {
          ...updatedLocs[locIndex],
          geoSource,
          geoStatus: "UNPARSEABLE",
        };
        updates.push({ id: doc.id, locations: updatedLocs });
      }
      parsedUnparseableCount++;
      continue;
    }

    // Validar rango Peru
    const isPeru = isInPeru(parsed.lat, parsed.lng);
    const status = isPeru ? "OK" : "OUT_OF_RANGE";

    if (isPeru) {
      parsedOkCount++;
    } else {
      parsedOutOfRangeCount++;
    }

    // Crear/actualizar ubicación
    const updatedLocs = [...locations];
    if (locIndex === -1) {
      updatedLocs.push({
        id: `loc-${doc.id}`,
        name: "Principal",
        address: customer.address || "",
        isDefault: true,
        latitude: parsed.lat,
        longitude: parsed.lng,
        geoSource,
        geoStatus: status,
      });
    } else {
      updatedLocs[locIndex] = {
        ...updatedLocs[locIndex],
        latitude: parsed.lat,
        longitude: parsed.lng,
        geoSource,
        geoStatus: status,
      };
    }

    updates.push({ id: doc.id, locations: updatedLocs });

    if (processed % 50 === 0 || processed === total) {
      process.stdout.write(`\rProcesados: ${processed}/${total}...`);
    }
  }

  console.log("\nProcesamiento terminado.");

  // Escribir cambios si está en modo commit
  let dbUpdatesCount = 0;
  if (commit && updates.length > 0) {
    console.log(`Aplicando ${updates.length} actualizaciones en Firestore en lotes de 500...`);
    
    let batch = newDb.batch();
    let countInBatch = 0;

    for (const update of updates) {
      const docRef = newDb.collection("customers").doc(update.id);
      batch.update(docRef, { locations: update.locations });
      countInBatch++;
      dbUpdatesCount++;

      if (countInBatch === 500) {
        await batch.commit();
        batch = newDb.batch();
        countInBatch = 0;
        console.log(`  - Lote de 500 commiteado`);
      }
    }

    if (countInBatch > 0) {
      await batch.commit();
      console.log(`  - Lote final de ${countInBatch} commiteado`);
    }
  }

  console.log("\n=============================================================");
  console.log("  RESUMEN DE MIGRACIÓN GEO");
  console.log("=============================================================");
  console.log(`Total Clientes            : ${total}`);
  console.log(`Evitados (Ya tenían coords): ${skippedAlreadyHasCoords}`);
  console.log(`Sin URL de Google Maps    : ${noUrlCount}`);
  console.log(`Cortos resueltos nuevos   : ${resolvedShortCount}`);
  console.log(`Cortos fallidos de resolver: ${failedResolveCount}`);
  console.log(`Coordenadas OK            : ${parsedOkCount}`);
  console.log(`Coordenadas Fuera de Rango: ${parsedOutOfRangeCount}`);
  console.log(`No parseables             : ${parsedUnparseableCount}`);
  console.log(`Actualizados en BD        : ${dbUpdatesCount}`);
  console.log("=============================================================\n");

  process.exit(0);
}

run().catch((e) => {
  console.error("❌ Error fatal en backfill:", e);
  process.exit(1);
});
