// scripts/backfill/test-date-conversion.ts

function formatToLimaISO(date: Date): string {
  try {
    const formatter = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "America/Lima",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    return formatter.format(date).replace(" ", "T") + "-05:00";
  } catch (e) {
    return date.toISOString();
  }
}

function calculateLiquidationDate(dispatchDate: Date): Date {
  const limaTime = new Date(dispatchDate.getTime() - 5 * 60 * 60 * 1000);
  const yyyy = limaTime.getUTCFullYear();
  const mm = limaTime.getUTCMonth();
  const dd = limaTime.getUTCDate();

  const targetUtcMs = Date.UTC(yyyy, mm, dd, 20 + 5, 0, 0, 0);
  return new Date(targetUtcMs);
}

const tests = [
  {
    name: "Caso 1: Salida en la mañana (Lima: 2026-06-04 08:30:00 -> UTC: 2026-06-04 13:30:00)",
    dispatch: new Date("2026-06-04T13:30:00Z"),
    expectedLima: "2026-06-04T20:00:00-05:00",
    expectedUtc: "2026-06-05T01:00:00.000Z"
  },
  {
    name: "Caso 2: Salida tarde en la noche (Lima: 2026-06-04 23:45:00 -> UTC: 2026-06-05 04:45:00)",
    dispatch: new Date("2026-06-05T04:45:00Z"),
    expectedLima: "2026-06-04T20:00:00-05:00",
    expectedUtc: "2026-06-05T01:00:00.000Z"
  },
  {
    name: "Caso 3: Salida muy temprano (Lima: 2026-06-04 01:15:00 -> UTC: 2026-06-04 06:15:00)",
    dispatch: new Date("2026-06-04T06:15:00Z"),
    expectedLima: "2026-06-04T20:00:00-05:00",
    expectedUtc: "2026-06-05T01:00:00.000Z"
  }
];

console.log("=== PROBANDO CONVERSIÓN DE ZONA HORARIA LIMA ===");
tests.forEach((t) => {
  const result = calculateLiquidationDate(t.dispatch);
  const resultLima = formatToLimaISO(result);
  const resultUtc = result.toISOString();

  const limaOk = resultLima === t.expectedLima;
  const utcOk = resultUtc === t.expectedUtc;

  console.log(`\nTest: ${t.name}`);
  console.log(`  - Calculado Lima: ${resultLima} (Esperado: ${t.expectedLima}) -> ${limaOk ? "✅ OK" : "❌ ERROR"}`);
  console.log(`  - Calculado UTC : ${resultUtc} (Esperado: ${t.expectedUtc}) -> ${utcOk ? "✅ OK" : "❌ ERROR"}`);
});
