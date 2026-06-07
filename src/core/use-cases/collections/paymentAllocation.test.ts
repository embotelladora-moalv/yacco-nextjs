import { describe, expect, it } from "vitest";
import {
  allocatePaymentFIFO,
  allocatePaymentDirected,
  validateDirectedAllocations,
  PendingSaleInput,
} from "./paymentAllocation";

describe("Asignación de Pagos - Lógica Pura (Fase 2)", () => {
  describe("1. allocatePaymentFIFO", () => {
    it("debe poner todas PAID cuando el monto cubre todas las ventas", () => {
      const sales: PendingSaleInput[] = [
        { id: "sale-1", totalAmount: 100, remainingBalance: 100 },
        { id: "sale-2", totalAmount: 150, remainingBalance: 150 },
      ];
      const result = allocatePaymentFIFO(250, sales);
      expect(result).toEqual([
        { saleId: "sale-1", amountApplied: 100, newRemainingBalance: 0, newPaymentStatus: "PAID" },
        { saleId: "sale-2", amountApplied: 150, newRemainingBalance: 0, newPaymentStatus: "PAID" },
      ]);
    });

    it("monto parcial -> primeras PAID, una PARTIAL, resto sin tocar", () => {
      const sales: PendingSaleInput[] = [
        { id: "sale-1", totalAmount: 100, remainingBalance: 100 },
        { id: "sale-2", totalAmount: 150, remainingBalance: 150 },
        { id: "sale-3", totalAmount: 200, remainingBalance: 200 },
      ];
      const result = allocatePaymentFIFO(180, sales);
      expect(result).toEqual([
        { saleId: "sale-1", amountApplied: 100, newRemainingBalance: 0, newPaymentStatus: "PAID" },
        { saleId: "sale-2", amountApplied: 80, newRemainingBalance: 70, newPaymentStatus: "PARTIAL" },
      ]);
    });

    it("monto exacto de una venta -> esa PAID", () => {
      const sales: PendingSaleInput[] = [
        { id: "sale-1", totalAmount: 100, remainingBalance: 100 },
        { id: "sale-2", totalAmount: 150, remainingBalance: 150 },
      ];
      const result = allocatePaymentFIFO(100, sales);
      expect(result).toEqual([
        { saleId: "sale-1", amountApplied: 100, newRemainingBalance: 0, newPaymentStatus: "PAID" },
      ]);
    });

    it("una sola venta, pago parcial -> PARTIAL con saldo correcto", () => {
      const sales: PendingSaleInput[] = [
        { id: "sale-1", totalAmount: 100, remainingBalance: 100 },
      ];
      const result = allocatePaymentFIFO(40, sales);
      expect(result).toEqual([
        { saleId: "sale-1", amountApplied: 40, newRemainingBalance: 60, newPaymentStatus: "PARTIAL" },
      ]);
    });

    it("monto 0 o sin ventas -> resultado vacío", () => {
      const sales: PendingSaleInput[] = [
        { id: "sale-1", totalAmount: 100, remainingBalance: 100 },
      ];
      expect(allocatePaymentFIFO(0, sales)).toEqual([]);
      expect(allocatePaymentFIFO(50, [])).toEqual([]);
    });

    it("usa remainingBalance cuando existe; cae a totalAmount cuando no", () => {
      const sales: PendingSaleInput[] = [
        { id: "sale-1", totalAmount: 100, remainingBalance: 40 },
        { id: "sale-2", totalAmount: 150 }, // no remainingBalance -> assumes 150
      ];
      const result = allocatePaymentFIFO(100, sales);
      expect(result).toEqual([
        { saleId: "sale-1", amountApplied: 40, newRemainingBalance: 0, newPaymentStatus: "PAID" },
        { saleId: "sale-2", amountApplied: 60, newRemainingBalance: 90, newPaymentStatus: "PARTIAL" },
      ]);
    });
  });

  describe("2. allocatePaymentDirected", () => {
    it("2 ventas elegidas, montos = saldos completos -> ambas PAID", () => {
      const sales: PendingSaleInput[] = [
        { id: "sale-1", totalAmount: 100, remainingBalance: 100 },
        { id: "sale-2", totalAmount: 150, remainingBalance: 150 },
        { id: "sale-3", totalAmount: 200, remainingBalance: 200 },
      ];
      const allocations = [
        { saleId: "sale-1", amount: 100 },
        { saleId: "sale-3", amount: 200 },
      ];
      const result = allocatePaymentDirected(300, allocations, sales);
      expect(result).toEqual([
        { saleId: "sale-1", amountApplied: 100, newRemainingBalance: 0, newPaymentStatus: "PAID" },
        { saleId: "sale-3", amountApplied: 200, newRemainingBalance: 0, newPaymentStatus: "PAID" },
      ]);
    });

    it("1 venta, monto < saldo -> PARTIAL, saldo correcto", () => {
      const sales: PendingSaleInput[] = [
        { id: "sale-1", totalAmount: 100, remainingBalance: 100 },
      ];
      const allocations = [{ saleId: "sale-1", amount: 45 }];
      const result = allocatePaymentDirected(45, allocations, sales);
      expect(result).toEqual([
        { saleId: "sale-1", amountApplied: 45, newRemainingBalance: 55, newPaymentStatus: "PARTIAL" },
      ]);
    });

    it("monto exacto del saldo -> PAID", () => {
      const sales: PendingSaleInput[] = [
        { id: "sale-1", totalAmount: 100, remainingBalance: 100 },
      ];
      const allocations = [{ saleId: "sale-1", amount: 100 }];
      const result = allocatePaymentDirected(100, allocations, sales);
      expect(result).toEqual([
        { saleId: "sale-1", amountApplied: 100, newRemainingBalance: 0, newPaymentStatus: "PAID" },
      ]);
    });
  });

  describe("3. validateDirectedAllocations", () => {
    const sales: PendingSaleInput[] = [
      { id: "sale-1", totalAmount: 100, remainingBalance: 40 },
      { id: "sale-2", totalAmount: 150 },
    ];

    it("suma != total -> invalid", () => {
      const allocations = [
        { saleId: "sale-1", amount: 40 },
        { saleId: "sale-2", amount: 50 },
      ];
      const result = validateDirectedAllocations(100, allocations, sales);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("no coincide con el monto total pagado");
    });

    it("alloc excede saldo de su venta -> invalid", () => {
      const allocations = [
        { saleId: "sale-1", amount: 45 },
      ];
      const result = validateDirectedAllocations(45, allocations, sales);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("excede el saldo pendiente");
    });

    it("caso válido -> valid:true", () => {
      const allocations = [
        { saleId: "sale-1", amount: 40 },
        { saleId: "sale-2", amount: 60 },
      ];
      const result = validateDirectedAllocations(100, allocations, sales);
      expect(result).toEqual({ valid: true });
    });

    it("tolerancias: suma con diferencia 0.005 (< 0.01) -> válido; 0.02 -> inválido", () => {
      const salesList = [{ id: "sale-1", totalAmount: 100 }];
      // Suma = 49.995, totalAmount = 50 (diferencia 0.005)
      expect(validateDirectedAllocations(50, [{ saleId: "sale-1", amount: 49.995 }], salesList)).toEqual({ valid: true });
      // Suma = 49.98, totalAmount = 50 (diferencia 0.02)
      const invalidResult = validateDirectedAllocations(50, [{ saleId: "sale-1", amount: 49.98 }], salesList);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toContain("no coincide con el monto total pagado");
    });

    it("exceso de 0.0005 (< 0.001) -> válido; 0.01 sobre saldo -> inválido", () => {
      const salesList = [{ id: "sale-1", totalAmount: 100, remainingBalance: 40 }];
      // Exceso de 0.0005 sobre saldo de 40 -> 40.0005
      expect(validateDirectedAllocations(40.0005, [{ saleId: "sale-1", amount: 40.0005 }], salesList)).toEqual({ valid: true });
      // Exceso de 0.01 sobre saldo de 40 -> 40.01
      const invalidResult = validateDirectedAllocations(40.01, [{ saleId: "sale-1", amount: 40.01 }], salesList);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toContain("excede el saldo pendiente");
    });
  });
});
