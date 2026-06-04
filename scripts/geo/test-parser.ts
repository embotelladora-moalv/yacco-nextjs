// scripts/geo/test-parser.ts

import { parseMapsLink, isInPeru } from "../../src/lib/geo/parseMapsLink";

const testCases = [
  {
    name: "Pin real priority (!3d!4d)",
    url: "https://www.google.com/maps/place/SomePlace/@-12.12345,-77.12345,17z/data=!3m1!4b1!4m6!3m5!1s0x9105c8!8m2!3d-12.55555!4d-77.99999",
    expected: { lat: -12.55555, lng: -77.99999, source: "pin" }
  },
  {
    name: "Camera center fallback (@lat,lng)",
    url: "https://www.google.com/maps/search/tecnofast/@-12.2947638,-76.8453197,4813m/data=!3m1!1e3",
    expected: { lat: -12.2947638, lng: -76.8453197, source: "camera" }
  },
  {
    name: "Query param fallback (q=lat,lng)",
    url: "https://maps.google.com/?q=-12.203656,-76.979698",
    expected: { lat: -12.203656, lng: -76.979698, source: "query" }
  },
  {
    name: "Invalid coordinates format",
    url: "https://google.com/maps/place/invalid",
    expected: null
  }
];

console.log("=== RUNNING PARSER UNIT TESTS ===");
let passed = 0;

testCases.forEach((tc) => {
  const result = parseMapsLink(tc.url);
  let match = false;

  if (tc.expected === null) {
    match = result === null;
  } else if (result) {
    match =
      Math.abs(result.lat - tc.expected.lat) < 0.000001 &&
      Math.abs(result.lng - tc.expected.lng) < 0.000001 &&
      result.source === tc.expected.source;
  }

  if (match) {
    console.log(`✅ Passed: ${tc.name}`);
    passed++;
  } else {
    console.error(`❌ Failed: ${tc.name}`);
    console.error(`   Expected:`, tc.expected);
    console.error(`   Got:     `, result);
  }
});

// Test Peru bounds
console.log("\n=== RUNNING PERU BOUNDS TESTS ===");
const peruCoords = { lat: -12.046374, lng: -77.042793 }; // Lima
const usaCoords = { lat: 37.7749, lng: -122.4194 }; // SF

if (isInPeru(peruCoords.lat, peruCoords.lng)) {
  console.log("✅ Passed: Lima is in Peru");
} else {
  console.error("❌ Failed: Lima should be in Peru");
}

if (!isInPeru(usaCoords.lat, usaCoords.lng)) {
  console.log("✅ Passed: San Francisco is NOT in Peru");
} else {
  console.error("❌ Failed: San Francisco should NOT be in Peru");
}

process.exit(passed === testCases.length ? 0 : 1);
