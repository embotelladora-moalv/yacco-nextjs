import { CustomerContainerBalance } from "@/core/entities/CRM";

/**
 * Calcula la diferencia neta de envases para cada producto modificado.
 * Filtra los deltas que sean iguales a 0.
 */
export function calculateAdjustmentDeltas(
  currentBalances: CustomerContainerBalance[],
  newBalances: { productId: string; balance: number }[]
): { productId: string; delta: number }[] {
  const containerDeltas: { productId: string; delta: number }[] = [];

  for (const item of newBalances) {
    const currentItem = currentBalances.find((b) => b.productId === item.productId);
    const currentBalance = currentItem ? Number(currentItem.balance) : 0;
    const delta = item.balance - currentBalance;

    if (delta !== 0) {
      containerDeltas.push({
        productId: item.productId,
        delta,
      });
    }
  }

  return containerDeltas;
}

/**
 * Combina de manera inmutable los balances actuales del cliente con los nuevos balances absolutos.
 * Los productos en currentBalances que no están en newBalances se preservan tal cual.
 * Los de newBalances que no estaban en currentBalances se agregan.
 */
export function mergeBalances(
  currentBalances: CustomerContainerBalance[],
  newBalances: { productId: string; balance: number }[]
): CustomerContainerBalance[] {
  const finalBalancesMap = new Map<string, number>();

  // Cargar balances actuales
  for (const item of currentBalances) {
    finalBalancesMap.set(item.productId, Number(item.balance));
  }

  // Sobreescribir con los nuevos
  for (const item of newBalances) {
    finalBalancesMap.set(item.productId, item.balance);
  }

  return Array.from(finalBalancesMap.entries()).map(([productId, balance]) => ({
    productId,
    balance,
  }));
}
