import { describe, expect, it } from "vitest";
import { calculateAdjustmentDeltas, mergeBalances } from "./containerAdjustment";
import { CustomerContainerBalance } from "@/core/entities/CRM";

describe("Ajuste de Envases - Lógica Pura (Fase 2)", () => {
  describe("1. calculateAdjustmentDeltas", () => {
    it("debe calcular delta positivo cuando el saldo aumenta", () => {
      const current: CustomerContainerBalance[] = [{ productId: "A", balance: 5 }];
      const adjustments = [{ productId: "A", balance: 7 }];
      const result = calculateAdjustmentDeltas(current, adjustments);
      expect(result).toEqual([{ productId: "A", delta: 2 }]);
    });

    it("debe retornar vacio si el nuevo saldo es idéntico", () => {
      const current: CustomerContainerBalance[] = [{ productId: "A", balance: 5 }];
      const adjustments = [{ productId: "A", balance: 5 }];
      const result = calculateAdjustmentDeltas(current, adjustments);
      expect(result).toEqual([]);
    });

    it("debe calcular delta positivo si el producto no existía", () => {
      const current: CustomerContainerBalance[] = [];
      const adjustments = [{ productId: "B", balance: 3 }];
      const result = calculateAdjustmentDeltas(current, adjustments);
      expect(result).toEqual([{ productId: "B", delta: 3 }]);
    });

    it("debe calcular delta negativo al bajar el saldo", () => {
      const current: CustomerContainerBalance[] = [{ productId: "A", balance: 5 }];
      const adjustments = [{ productId: "A", balance: 2 }];
      const result = calculateAdjustmentDeltas(current, adjustments);
      expect(result).toEqual([{ productId: "A", delta: -3 }]);
    });

    it("debe soportar múltiples productos mezclados", () => {
      const current: CustomerContainerBalance[] = [
        { productId: "A", balance: 5 },
        { productId: "B", balance: 2 },
      ];
      const adjustments = [
        { productId: "A", balance: 2 }, // delta -3
        { productId: "B", balance: 2 }, // delta 0
        { productId: "C", balance: 4 }, // delta +4
      ];
      const result = calculateAdjustmentDeltas(current, adjustments);
      expect(result).toEqual(
        expect.arrayContaining([
          { productId: "A", delta: -3 },
          { productId: "C", delta: 4 },
        ])
      );
      expect(result).toHaveLength(2);
    });
  });

  describe("2. mergeBalances", () => {
    it("debe actualizar el balance del producto indicado y preservar los no mencionados", () => {
      const current: CustomerContainerBalance[] = [
        { productId: "A", balance: 5 },
        { productId: "B", balance: 3 },
      ];
      const adjustments = [{ productId: "A", balance: 7 }];
      const result = mergeBalances(current, adjustments);
      expect(result).toEqual(
        expect.arrayContaining([
          { productId: "A", balance: 7 },
          { productId: "B", balance: 3 },
        ])
      );
      expect(result).toHaveLength(2);
    });

    it("debe agregar un nuevo producto si no existía previamente", () => {
      const current: CustomerContainerBalance[] = [{ productId: "A", balance: 5 }];
      const adjustments = [
        { productId: "A", balance: 5 },
        { productId: "C", balance: 2 },
      ];
      const result = mergeBalances(current, adjustments);
      expect(result).toEqual(
        expect.arrayContaining([
          { productId: "A", balance: 5 },
          { productId: "C", balance: 2 },
        ])
      );
      expect(result).toHaveLength(2);
    });

    it("debe funcionar correctamente con cliente sin balances previos", () => {
      const current: CustomerContainerBalance[] = [];
      const adjustments = [{ productId: "A", balance: 4 }];
      const result = mergeBalances(current, adjustments);
      expect(result).toEqual([{ productId: "A", balance: 4 }]);
    });

    it("debe retornar los balances intactos si no hay ajustes nuevos", () => {
      const current: CustomerContainerBalance[] = [
        { productId: "A", balance: 5 },
        { productId: "B", balance: 3 },
      ];
      const adjustments: { productId: string; balance: number }[] = [];
      const result = mergeBalances(current, adjustments);
      expect(result).toEqual(
        expect.arrayContaining([
          { productId: "A", balance: 5 },
          { productId: "B", balance: 3 },
        ])
      );
      expect(result).toHaveLength(2);
    });
  });
});
