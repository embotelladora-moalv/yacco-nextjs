import admin from 'firebase-admin';
import { parsePeruDatetimeLocal } from '../../src/core/utils/dateUtils';

async function test() {
  // Apertura: Ayer 22:00 Perú
  // Ayer 22:00 Perú = Hoy 03:00 UTC
  const aperturePeru = "2026-06-06T22:00";
  const apertureUtc = new Date("2026-06-07T03:00:00Z");
  
  // Cierre: Hoy 08:00 Perú
  // Hoy 08:00 Perú = Hoy 13:00 UTC
  const closurePeru = "2026-06-07T08:00";
  const closureUtc = parsePeruDatetimeLocal(closurePeru);

  console.log("--- Borde de Día (UTC vs Perú) ---");
  console.log(`Apertura (UI Perú): ${aperturePeru}`);
  console.log(`Apertura (Instante UTC): ${apertureUtc.toISOString()}`);
  console.log(`Cierre (UI Perú): ${closurePeru}`);
  console.log(`Cierre (Instante UTC calculado): ${closureUtc.toISOString()}`);

  const isValid = closureUtc >= apertureUtc;
  console.log(`¿Validación de rango (Cierre >= Apertura)?: ${isValid ? "✅ PASÓ" : "❌ FALLÓ"}`);

  if (closureUtc.toISOString() === "2026-06-07T13:00:00.000Z") {
    console.log("✅ Instante UTC de cierre es correcto (Sumó 5h)");
  } else {
    console.log("❌ Instante UTC de cierre INCORRECTO");
  }
}

test();