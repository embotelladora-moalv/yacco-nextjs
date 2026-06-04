// src/lib/geo/parseMapsLink.ts

export interface ParsedCoordinates {
  lat: number;
  lng: number;
  source: "pin" | "camera" | "query";
}

/**
 * Parses a Google Maps URL to extract latitude and longitude.
 * Priority: Pin real (!3d!4d) > Camera center (@lat,lng) > Query param (q=lat,lng)
 */
export function parseMapsLink(url: string): ParsedCoordinates | null {
  if (!url) return null;

  // 1. Priority 1: Pin real (!3d!4d)
  // Example: ...!3d-12.12345!4d-77.12345...
  const pinMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (pinMatch) {
    const lat = parseFloat(pinMatch[1]);
    const lng = parseFloat(pinMatch[2]);
    if (isValidCoordinates(lat, lng)) {
      return { lat, lng, source: "pin" };
    }
  }

  // 2. Priority 2: Camera center (@lat,lng)
  // Example: .../@-12.12345,-77.12345,17z...
  const cameraMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (cameraMatch) {
    const lat = parseFloat(cameraMatch[1]);
    const lng = parseFloat(cameraMatch[2]);
    if (isValidCoordinates(lat, lng)) {
      return { lat, lng, source: "camera" };
    }
  }

  // 3. Priority 3: Query param (q=lat,lng)
  // Example: ...?q=-12.12345,-77.12345
  const queryMatch = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (queryMatch) {
    const lat = parseFloat(queryMatch[1]);
    const lng = parseFloat(queryMatch[2]);
    if (isValidCoordinates(lat, lng)) {
      return { lat, lng, source: "query" };
    }
  }

  return null;
}

/**
 * Validates that latitude is within [-90, 90] and longitude is within [-180, 180]
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
  return (
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Validates that coordinates fall approximately in Peru:
 * Latitude: ~ -18.5 to 0
 * Longitude: ~ -82 to -68
 */
export function isInPeru(lat: number, lng: number): boolean {
  return lat >= -18.5 && lat <= 0 && lng >= -82 && lng <= -68;
}
