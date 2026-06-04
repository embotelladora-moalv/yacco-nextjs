// scripts/geo/inspect-maps-links.ts
//
// FASE 1: INSPECCIÓN (SOLO LECTURA)
// Clasifica los enlaces de Google Maps de los clientes del proyecto nuevo.
//
// Uso:
//   NEW_SA_PATH=/ruta/nuevo-service-account.json npx ts-node \
//     -O '{"module": "commonjs", "moduleResolution": "node", "esModuleInterop": true}' \
//     scripts/geo/inspect-maps-links.ts

import { newDb } from "../migration/connections";
import * as fs from "fs";
import * as path from "path";

interface ClassifyStats {
  type: string;
  count: number;
  percentage: string;
  examples: string[];
}

async function run() {
  console.log("=== INICIANDO INSPECCIÓN DE ENLACES DE UBICACIÓN ===");

  const customersSnap = await newDb.collection("customers").get();
  const totalCustomers = customersSnap.size;
  console.log(`Clientes totales leídos: ${totalCustomers}`);

  let pathStats: Record<string, number> = {};
  
  // Categorías de clasificación
  const longUrls: string[] = [];
  const shortUrls: string[] = [];
  const emptyOrBasura: string[] = [];
  const unrecognizedUrls: string[] = [];

  // Patrones
  // - Cortos: maps.app.goo.gl o goo.gl/maps
  const shortRegex = /maps\.app\.goo\.gl|goo\.gl\/maps/i;
  // - Largos con coords inline: @lat,lng o !3d!4d o q=lat,lng
  const longRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)|!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)|q=(-?\d+\.\d+),(-?\d+\.\d+)/i;
  
  // Basura conocida
  const garbageValues = new Set(["sd", "s/d", "sin direccion", "no tiene", "-", "n/a", "null", "undefined"]);

  customersSnap.docs.forEach((doc) => {
    const data = doc.data();
    let foundUrl: string | null = null;
    let foundPath: string | null = null;

    // 1. Buscar en locations[].locationUrl o locations[].url
    if (Array.isArray(data.locations)) {
      data.locations.forEach((loc: any, idx: number) => {
        if (loc.locationUrl && typeof loc.locationUrl === "string") {
          foundUrl = loc.locationUrl.trim();
          foundPath = `locations[${idx}].locationUrl`;
        } else if (loc.url && typeof loc.url === "string") {
          foundUrl = loc.url.trim();
          foundPath = `locations[${idx}].url`;
        }
      });
    }

    // 2. Si no se encontró, buscar a nivel de raíz (coordenada, mapsUrl, etc.)
    if (!foundUrl) {
      if (data.coordenada && typeof data.coordenada === "string") {
        foundUrl = data.coordenada.trim();
        foundPath = "coordenada";
      } else if (data.mapsUrl && typeof data.mapsUrl === "string") {
        foundUrl = data.mapsUrl.trim();
        foundPath = "mapsUrl";
      }
    }

    // 3. Clasificación
    if (!foundUrl || foundUrl === "" || garbageValues.has(foundUrl.toLowerCase())) {
      emptyOrBasura.push(foundUrl || "(vacío)");
    } else if (shortRegex.test(foundUrl)) {
      shortUrls.push(foundUrl);
      if (foundPath) pathStats[foundPath] = (pathStats[foundPath] ?? 0) + 1;
    } else if (longRegex.test(foundUrl)) {
      longUrls.push(foundUrl);
      if (foundPath) pathStats[foundPath] = (pathStats[foundPath] ?? 0) + 1;
    } else {
      // Si tiene pinta de URL
      if (foundUrl.startsWith("http://") || foundUrl.startsWith("https://") || foundUrl.includes("maps") || foundUrl.includes("google")) {
        unrecognizedUrls.push(foundUrl);
        if (foundPath) pathStats[foundPath] = (pathStats[foundPath] ?? 0) + 1;
      } else {
        // Si no tiene pinta de URL, se considera basura/dirección de texto suelto
        emptyOrBasura.push(foundUrl);
      }
    }
  });

  const totalClassified = longUrls.length + shortUrls.length + emptyOrBasura.length + unrecognizedUrls.length;

  const pct = (count: number) => ((count / totalCustomers) * 100).toFixed(2) + "%";

  // Armar reporte JSON
  const report = {
    totalCustomers,
    pathDistribution: pathStats,
    summary: {
      longUrls: { count: longUrls.length, percentage: pct(longUrls.length) },
      shortUrls: { count: shortUrls.length, percentage: pct(shortUrls.length) },
      emptyOrBasura: { count: emptyOrBasura.length, percentage: pct(emptyOrBasura.length) },
      unrecognizedUrls: { count: unrecognizedUrls.length, percentage: pct(unrecognizedUrls.length) }
    },
    examples: {
      longUrls: longUrls.slice(0, 5),
      shortUrls: shortUrls.slice(0, 5),
      emptyOrBasura: emptyOrBasura.slice(0, 5),
      unrecognizedUrls: unrecognizedUrls.slice(0, 5)
    }
  };

  const reportPath = path.resolve(__dirname, "links-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`\nReporte guardado en: ${reportPath}`);

  // Mostrar tabla en consola
  console.log("\n=============================================================");
  console.log("  RESULTADOS DE LA CLASIFICACIÓN DE ENLACES DE GOOGLE MAPS");
  console.log("=============================================================");
  console.log("| Tipo de Enlace | Cantidad | Porcentaje |");
  console.log("|----------------|----------|------------|");
  console.log(`| LARGO (Coords) | ${longUrls.length.toString().padEnd(8)} | ${pct(longUrls.length).padEnd(10)} |`);
  console.log(`| CORTO (goo.gl) | ${shortUrls.length.toString().padEnd(8)} | ${pct(shortUrls.length).padEnd(10)} |`);
  console.log(`| VACÍO/BASURA   | ${emptyOrBasura.length.toString().padEnd(8)} | ${pct(emptyOrBasura.length).padEnd(10)} |`);
  console.log(`| NO RECONOCIDO  | ${unrecognizedUrls.length.toString().padEnd(8)} | ${pct(unrecognizedUrls.length).padEnd(10)} |`);
  console.log("=============================================================");

  console.log("\nDistribución de Paths de Origen:");
  Object.entries(pathStats).forEach(([p, count]) => {
    console.log(`  - ${p}: ${count} enlaces`);
  });

  console.log("\nEjemplos por tipo:");
  console.log("\n1. LARGO (con coordenadas inline):");
  longUrls.slice(0, 5).forEach((url, i) => console.log(`   [${i+1}] ${url}`));
  
  console.log("\n2. CORTO (requiere redirect):");
  shortUrls.slice(0, 5).forEach((url, i) => console.log(`   [${i+1}] ${url}`));

  console.log("\n3. VACÍO / BASURA (no es link de maps):");
  emptyOrBasura.slice(0, 5).forEach((val, i) => console.log(`   [${i+1}] "${val}"`));

  console.log("\n4. OTROS FORMATOS NO RECONOCIDOS (mostrando hasta 5):");
  if (unrecognizedUrls.length === 0) {
    console.log("   (ninguno)");
  } else {
    unrecognizedUrls.slice(0, 5).forEach((url, i) => console.log(`   [${i+1}] ${url}`));
  }

  process.exit(0);
}

run().catch((e) => {
  console.error("❌ Error en la inspección:", e);
  process.exit(1);
});
