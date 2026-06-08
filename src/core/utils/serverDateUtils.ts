import admin from "firebase-admin";
import { OFFSET_PERU_MS } from "./dateUtils";

/**
 * Retorna un Timestamp de Firestore que representa el inicio de un mes en Perú (medianoche).
 * Este helper es SOLO para uso en el servidor (Node.js/Admin SDK).
 */
export function getPeruMonthStartUtc(year: number, monthIndex: number) {
  // Medianoche 00:00:00 del día 1 en Perú = 05:00:00 UTC del mismo día
  return admin.firestore.Timestamp.fromDate(new Date(Date.UTC(year, monthIndex, 1, 5, 0, 0, 0)));
}
