import { describe, it, expect } from "vitest";
import { resolvePrice, PricingProduct, CustomPrice } from "./resolvePrice";

describe("resolvePrice use case", () => {
  const product: PricingProduct = {
    id: "prod-1",
    name: "Agua 20L",
    priceRefill: 15,
    priceFull: 45,
    priceEmpty: 30
  };

  it("should use base product prices when customPrices is undefined (Bug-03 fix)", () => {
    const result = resolvePrice(undefined, product, "REFILL");
    expect(result.price).toBe(15);
    expect(result.description).toBe("Recarga de Agua 20L");
  });

  it("should use base product prices when customPrices is an empty array", () => {
    const result = resolvePrice([], product, "FULL");
    expect(result.price).toBe(45);
    expect(result.description).toBe("Venta Nueva de Agua 20L");
  });

  it("should use custom price when available for the specific product", () => {
    const customPrices: CustomPrice[] = [
      {
        productId: "prod-1",
        refillPrice: 12,
        fullPrice: 40,
        bottlePrice: 28
      }
    ];

    const refill = resolvePrice(customPrices, product, "REFILL");
    expect(refill.price).toBe(12);

    const full = resolvePrice(customPrices, product, "FULL");
    expect(full.price).toBe(40);

    const bottle = resolvePrice(customPrices, product, "BOTTLE");
    expect(bottle.price).toBe(28);
  });

  it("should ignore custom prices for other products", () => {
    const customPrices: CustomPrice[] = [
      {
        productId: "other-prod",
        refillPrice: 10
      }
    ];

    const result = resolvePrice(customPrices, product, "REFILL");
    expect(result.price).toBe(15); // uses base price
  });

  it("should fallback to base price if a specific custom price field is missing (partial custom pricing)", () => {
    const customPrices: CustomPrice[] = [
      {
        productId: "prod-1",
        refillPrice: 13
        // fullPrice and bottlePrice are missing
      }
    ];

    const refill = resolvePrice(customPrices, product, "REFILL");
    expect(refill.price).toBe(13);

    const full = resolvePrice(customPrices, product, "FULL");
    expect(full.price).toBe(45); // fallback to base
  });

  it("should fallback to base price if custom price is 0 (intentional || behavior)", () => {
    const customPrices: CustomPrice[] = [
      {
        productId: "prod-1",
        refillPrice: 0 // Explicit 0 should fallback with ||
      }
    ];

    const result = resolvePrice(customPrices, product, "REFILL");
    expect(result.price).toBe(15); // falls back to base 15
  });

  it("should handle STANDARD type (OrderForm case)", () => {
    const result = resolvePrice([], product, "STANDARD");
    expect(result.price).toBe(45);
    expect(result.description).toBe("Agua 20L");
  });

  it("should return 0 price for unknown types or missing base prices", () => {
    const emptyProduct: PricingProduct = {
      id: "prod-2",
      name: "Empty",
      priceRefill: 0,
      priceFull: 0,
      priceEmpty: 0
    };

    const result = resolvePrice([], emptyProduct, "REFILL");
    expect(result.price).toBe(0);
  });
});
