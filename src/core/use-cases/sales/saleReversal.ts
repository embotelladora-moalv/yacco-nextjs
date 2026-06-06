import { SaleItem, SaleEmptyReturn, CustomerContainerBalance } from "@/core/entities/CRM";
import { DispatchItem } from "@/core/entities/Dispatch";

/**
 * Calcula el delta inverso de envases para la anulación de una venta.
 * Las cantidades vendidas (items) restan del saldo del cliente (el cliente devuelve lo que llevó),
 * y los envases devueltos originalmente (returnedEmpties) suman (devolvemos los vacíos que entregó).
 */
export function calculateInverseContainerDeltas(
  items: SaleItem[],
  returnedEmpties: SaleEmptyReturn[]
): { productId: string; delta: number }[] {
  const deltaMap = new Map<string, number>();

  (items || []).forEach((item) => {
    deltaMap.set(item.productId, (deltaMap.get(item.productId) || 0) - item.quantity);
  });

  (returnedEmpties || []).forEach((empty) => {
    deltaMap.set(empty.productId, (deltaMap.get(empty.productId) || 0) + empty.quantity);
  });

  return Array.from(deltaMap.entries())
    .map(([productId, delta]) => ({ productId, delta }))
    .filter((x) => x.delta !== 0);
}

/**
 * Aplica los deltas inversos sobre los balances de envases actuales del cliente,
 * retornando un nuevo arreglo inmutable.
 */
export function applyContainerDeltas(
  currentBalances: CustomerContainerBalance[],
  deltas: { productId: string; delta: number }[]
): CustomerContainerBalance[] {
  const balanceMap = new Map<string, number>();

  (currentBalances || []).forEach((b) => balanceMap.set(b.productId, b.balance));

  deltas.forEach(({ productId, delta }) => {
    const current = balanceMap.get(productId) || 0;
    balanceMap.set(productId, current + delta);
  });

  return Array.from(balanceMap.entries()).map(([productId, balance]) => ({
    productId,
    balance,
  }));
}

/**
 * Calcula el monto exacto de la deuda a restar al cliente tras la anulación de la venta.
 * Si remainingBalance está definido en el ticket (caso principal de la base de datos), se usa directamente.
 * De lo contrario, se calcula como el monto total menos los pagos de contado realizados.
 */
export function calculateDebtToReverse(sale: {
  totalAmount: number;
  cashReceived: number;
  digitalReceived: number;
  paymentMethod: string;
  remainingBalance?: number;
}): number {
  if (sale.remainingBalance !== undefined) {
    return sale.remainingBalance;
  }

  const totalPaid = (sale.cashReceived || 0) + (sale.digitalReceived || 0);
  return sale.paymentMethod === "CREDIT"
    ? sale.totalAmount
    : Math.max(0, sale.totalAmount - totalPaid);
}

/**
 * Actualiza de forma inmutable la cantidad de productos vendidos (quantitySold)
 * de un camión/manifiesto al anular los ítems de una venta.
 */
export function reverseManifestItems(
  manifestItems: DispatchItem[],
  saleItems: SaleItem[]
): DispatchItem[] {
  return (manifestItems || []).map((mItem) => {
    const matchedSales = (saleItems || []).filter(
      (sItem) => sItem.productId === mItem.productId && sItem.lotNumber === mItem.lotNumber
    );

    if (matchedSales.length === 0) {
      return { ...mItem };
    }

    const totalQuantityToRevert = matchedSales.reduce((sum, sItem) => sum + sItem.quantity, 0);
    const newQuantitySold = Math.max(0, (mItem.quantitySold || 0) - totalQuantityToRevert);

    return {
      ...mItem,
      quantitySold: newQuantitySold,
    };
  });
}
