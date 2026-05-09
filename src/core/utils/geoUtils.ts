export interface Point {
  lat: number;
  lng: number;
  id: string;
  name: string;
}

/** Calcula distancia Haversine en KM */
export function getDistanceInKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/** Algoritmo Greedy para Ruta Óptima */
export function calculateOptimalRoute(points: Point[]): Point[] {
  if (points.length <= 2) return points;

  const route: Point[] = [points[0]];
  const unvisited = [...points.slice(1)];

  while (unvisited.length > 0) {
    const last = route[route.length - 1];
    let closestIndex = 0;
    let minDistance = Infinity;

    unvisited.forEach((p, idx) => {
      const d = getDistanceInKm(last.lat, last.lng, p.lat, p.lng);
      if (d < minDistance) {
        minDistance = d;
        closestIndex = idx;
      }
    });

    route.push(unvisited.splice(closestIndex, 1)[0]);
  }
  return route;
}
