import { describe, expect, it } from "vitest";
import {
  calculateInverseContainerDeltas,
  applyContainerDeltas,
  calculateDebtToReverse,
  reverseManifestItems,
} from "./saleReversal";
import { SaleItem, SaleEmptyReturn, CustomerContainerBalance } from "@/core/entities/CRM";
import { DispatchItem } from "@/core/entities/Dispatch";

describe("Anulación de Ventas - Lógica Pura de Reversa", () => {
  describe("A. calculateInverseContainerDeltas", () => {
    it("debe retornar delta negativo en venta simple de un producto", () => {
      const items: SaleItem[] = [
        { productId: "prodA", quantity: 5, unitPrice: 10, subtotal: 50, lotNumber: "L1" },
      ];
      const returnedEmpties: SaleEmptyReturn[] = [];
      const result = calculateInverseContainerDeltas(items, returnedEmpties);
      expect(result).toEqual([{ productId: "prodA", delta: -5 }]);
    });

    it("debe restar venta y sumar vacíos devueltos del mismo producto", () => {
      const items: SaleItem[] = [
        { productId: "prodA", quantity: 5, unitPrice: 10, subtotal: 50, lotNumber: "L1" },
      ];
      const returnedEmpties: SaleEmptyReturn[] = [
        { productId: "prodA", quantity: 2 },
      ];
      const result = calculateInverseContainerDeltas(items, returnedEmpties);
      expect(result).toEqual([{ productId: "prodA", delta: -3 }]);
    });

    it("debe soportar múltiples productos distintos", () => {
      const items: SaleItem[] = [
        { productId: "prodA", quantity: 4, unitPrice: 10, subtotal: 40, lotNumber: "L1" },
        { productId: "prodB", quantity: 3, unitPrice: 20, subtotal: 60, lotNumber: "L2" },
      ];
      const returnedEmpties: SaleEmptyReturn[] = [
        { productId: "prodA", quantity: 1 },
        { productId: "prodC", quantity: 2 },
      ];
      const result = calculateInverseContainerDeltas(items, returnedEmpties);
      // prodA: -4 + 1 = -3
      // prodB: -3 + 0 = -3
      // prodC:  0 + 2 = +2
      expect(result).toEqual(
        expect.arrayContaining([
          { productId: "prodA", delta: -3 },
          { productId: "prodB", delta: -3 },
          { productId: "prodC", delta: 2 },
        ])
      );
      expect(result).toHaveLength(3);
    });

    it("debe filtrar deltas que den 0 neto", () => {
      const items: SaleItem[] = [
        { productId: "prodA", quantity: 5, unitPrice: 10, subtotal: 50, lotNumber: "L1" },
      ];
      const returnedEmpties: SaleEmptyReturn[] = [
        { productId: "prodA", quantity: 5 },
      ];
      const result = calculateInverseContainerDeltas(items, returnedEmpties);
      expect(result).toEqual([]);
    });

    it("debe retornar array vacío si las listas de entrada están vacías", () => {
      const result = calculateInverseContainerDeltas([], []);
      expect(result).toEqual([]);
    });
  });

  describe("B. applyContainerDeltas", () => {
    it("debe aplicar delta negativo a balance existente", () => {
      const currentBalances: CustomerContainerBalance[] = [
        { productId: "prodA", balance: 10 },
      ];
      const deltas = [{ productId: "prodA", delta: -5 }];
      const result = applyContainerDeltas(currentBalances, deltas);
      expect(result).toEqual([{ productId: "prodA", balance: 5 }]);
    });

    it("debe crear una nueva entrada de balance si el producto no existía en el cliente", () => {
      const currentBalances: CustomerContainerBalance[] = [];
      const deltas = [{ productId: "prodA", delta: -5 }];
      const result = applyContainerDeltas(currentBalances, deltas);
      expect(result).toEqual([{ productId: "prodA", balance: -5 }]);
    });

    it("debe permitir balances negativos (saldo de envases a favor del cliente)", () => {
      const currentBalances: CustomerContainerBalance[] = [
        { productId: "prodA", balance: 2 },
      ];
      const deltas = [{ productId: "prodA", delta: -5 }];
      const result = applyContainerDeltas(currentBalances, deltas);
      expect(result).toEqual([{ productId: "prodA", balance: -3 }]);
    });
  });

  describe("C. calculateDebtToReverse", () => {
    it("debe retornar remainingBalance si está definido en el ticket", () => {
      const sale = {
        totalAmount: 100,
        cashReceived: 60,
        digitalReceived: 0,
        paymentMethod: "MIXED",
        remainingBalance: 40,
      };
      const result = calculateDebtToReverse(sale);
      expect(result).toBe(40);
    });

    it("debe retornar totalAmount si es venta a CRÉDITO y remainingBalance está indefinido", () => {
      const sale = {
        totalAmount: 120,
        cashReceived: 0,
        digitalReceived: 0,
        paymentMethod: "CREDIT",
      };
      const result = calculateDebtToReverse(sale);
      expect(result).toBe(120);
    });

    it("debe retornar la diferencia total - pagado en venta MIXED / contado si remainingBalance está indefinido", () => {
      const sale = {
        totalAmount: 100,
        cashReceived: 60,
        digitalReceived: 10,
        paymentMethod: "MIXED",
      };
      const result = calculateDebtToReverse(sale);
      // total (100) - pagado (70) = 30
      expect(result).toBe(30);
    });

    it("debe retornar 0 si se pagó el 100% de la venta y remainingBalance está indefinido", () => {
      const sale = {
        totalAmount: 80,
        cashReceived: 80,
        digitalReceived: 0,
        paymentMethod: "CASH",
      };
      const result = calculateDebtToReverse(sale);
      expect(result).toBe(0);
    });
  });

  describe("D. reverseManifestItems", () => {
    it("debe restar quantitySold del lote exacto de un manifiesto", () => {
      const manifestItems: DispatchItem[] = [
        { productId: "prodA", lotNumber: "L1", quantityLoaded: 10, quantitySold: 5, wasteQuantity: 0 },
        { productId: "prodA", lotNumber: "L2", quantityLoaded: 10, quantitySold: 3, wasteQuantity: 0 },
      ];
      const saleItems: SaleItem[] = [
        { productId: "prodA", quantity: 3, unitPrice: 10, subtotal: 30, lotNumber: "L1" },
      ];

      const result = reverseManifestItems(manifestItems, saleItems);

      expect(result).toEqual([
        { productId: "prodA", lotNumber: "L1", quantityLoaded: 10, quantitySold: 2, wasteQuantity: 0 },
        { productId: "prodA", lotNumber: "L2", quantityLoaded: 10, quantitySold: 3, wasteQuantity: 0 },
      ]);
    });

    it("debe restar correctamente cuando la venta está dividida en múltiples lotes", () => {
      const manifestItems: DispatchItem[] = [
        { productId: "prodA", lotNumber: "L1", quantityLoaded: 10, quantitySold: 5, wasteQuantity: 0 },
        { productId: "prodA", lotNumber: "L2", quantityLoaded: 10, quantitySold: 5, wasteQuantity: 0 },
      ];
      const saleItems: SaleItem[] = [
        { productId: "prodA", quantity: 2, unitPrice: 10, subtotal: 20, lotNumber: "L1" },
        { productId: "prodA", quantity: 3, unitPrice: 10, subtotal: 30, lotNumber: "L2" },
      ];

      const result = reverseManifestItems(manifestItems, saleItems);

      expect(result).toEqual([
        { productId: "prodA", lotNumber: "L1", quantityLoaded: 10, quantitySold: 3, wasteQuantity: 0 },
        { productId: "prodA", lotNumber: "L2", quantityLoaded: 10, quantitySold: 2, wasteQuantity: 0 },
      ]);
    });

    it("no debe disminuir quantitySold por debajo de 0", () => {
      const manifestItems: DispatchItem[] = [
        { productId: "prodA", lotNumber: "L1", quantityLoaded: 10, quantitySold: 2, wasteQuantity: 0 },
      ];
      const saleItems: SaleItem[] = [
        { productId: "prodA", quantity: 5, unitPrice: 10, subtotal: 50, lotNumber: "L1" },
      ];

      const result = reverseManifestItems(manifestItems, saleItems);
      expect(result[0].quantitySold).toBe(0);
    });

    it("no debe mutar el array de entrada original (inmutabilidad)", () => {
      const manifestItems: DispatchItem[] = [
        { productId: "prodA", lotNumber: "L1", quantityLoaded: 10, quantitySold: 5, wasteQuantity: 0 },
      ];
      const saleItems: SaleItem[] = [
        { productId: "prodA", quantity: 3, unitPrice: 10, subtotal: 30, lotNumber: "L1" },
      ];

      const result = reverseManifestItems(manifestItems, saleItems);

      // El resultado debe cambiar
      expect(result[0].quantitySold).toBe(2);
      // El original no debe verse alterado
      expect(manifestItems[0].quantitySold).toBe(5);
    });

    it("debe ignorar items de venta que no coincidan en el manifiesto sin arrojar error", () => {
      const manifestItems: DispatchItem[] = [
        { productId: "prodA", lotNumber: "L1", quantityLoaded: 10, quantitySold: 5, wasteQuantity: 0 },
      ];
      const saleItems: SaleItem[] = [
        { productId: "prodB", quantity: 3, unitPrice: 10, subtotal: 30, lotNumber: "L2" },
      ];

      const result = reverseManifestItems(manifestItems, saleItems);
      expect(result).toEqual([
        { productId: "prodA", lotNumber: "L1", quantityLoaded: 10, quantitySold: 5, wasteQuantity: 0 },
      ]);
    });
  });
});
