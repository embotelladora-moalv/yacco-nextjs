/**
 * USE-CASE: resolvePrice
 * 
 * Centralized logic to resolve the unit price and description of a product item 
 * based on the customer's custom price list and the product's base price.
 */

export type CustomPrice = {
  productId: string;
  refillPrice?: number;
  fullPrice?: number;
  bottlePrice?: number;
};

export type PricingProduct = {
  id: string;
  name: string;
  priceRefill: number;
  priceFull: number;
  priceEmpty: number;
};

export type ItemSaleType = "REFILL" | "FULL" | "BOTTLE" | "STANDARD";

/**
 * Resolves the price and description for a sale/order item.
 * 
 * @param customPrices - Array of custom prices for the customer. Safely handles undefined/null.
 * @param product - The product being priced.
 * @param itemSaleType - The type of sale (Recarga, Venta Nueva, Envase Vacío, Standard).
 * @returns { price: number, description: string }
 */
export function resolvePrice(
  customPrices: CustomPrice[] | undefined,
  product: PricingProduct,
  itemSaleType: ItemSaleType
): { price: number; description: string } {
  // Safe find to avoid crashes if customPrices is undefined/null (BUG-03 fix)
  const customPrice = (customPrices ?? []).find(
    (cp) => cp.productId === product.id
  );

  let price = 0;
  let description = product.name;

  /**
   * NOTE: We use the logical OR (||) operator instead of the nullish coalescing (??)
   * operator for prices. This is INTENTIONAL to preserve existing behavior:
   * if a custom price or product base price is explicitly 0, it is treated as "falsy"
   * and the logic falls back to the next available price or 0.
   */

  switch (itemSaleType) {
    case "REFILL":
      price = customPrice?.refillPrice || product.priceRefill || 0;
      description = `Recarga de ${product.name}`;
      break;

    case "FULL":
      price = customPrice?.fullPrice || product.priceFull || 0;
      description = `Venta Nueva de ${product.name}`;
      break;

    case "BOTTLE":
      price = customPrice?.bottlePrice || product.priceEmpty || 0;
      description = `Envase Vacío de ${product.name}`;
      break;

    case "STANDARD":
      price = product.priceFull || 0;
      description = product.name;
      break;

    default:
      price = 0;
      description = product.name;
      break;
  }

  return { price, description };
}
