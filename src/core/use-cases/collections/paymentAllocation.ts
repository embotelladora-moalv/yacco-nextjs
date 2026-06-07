export type PendingSaleInput = {
  id: string;
  totalAmount: number;
  remainingBalance?: number;
};

export type AllocationResult = {
  saleId: string;
  amountApplied: number;
  newRemainingBalance: number;
  newPaymentStatus: "PAID" | "PARTIAL";
};

/**
 * Distribuye un monto de pago a una lista de ventas pendientes ordenadas por antigüedad (FIFO).
 */
export function allocatePaymentFIFO(
  amount: number,
  pendingSales: PendingSaleInput[]
): AllocationResult[] {
  const results: AllocationResult[] = [];
  let amountToDistribute = amount;

  for (const sale of pendingSales) {
    if (amountToDistribute <= 0) break;

    const currentBalance = sale.remainingBalance ?? sale.totalAmount;
    if (currentBalance <= 0) continue;

    let appliedInThisTicket = 0;
    let newBalance = 0;
    let newStatus: "PAID" | "PARTIAL" = "PAID";

    if (amountToDistribute >= currentBalance) {
      appliedInThisTicket = currentBalance;
      amountToDistribute -= currentBalance;
      newBalance = 0;
      newStatus = "PAID";
    } else {
      appliedInThisTicket = amountToDistribute;
      newBalance = currentBalance - amountToDistribute;
      amountToDistribute = 0;
      newStatus = "PARTIAL";
    }

    if (appliedInThisTicket > 0) {
      results.push({
        saleId: sale.id,
        amountApplied: appliedInThisTicket,
        newRemainingBalance: newBalance,
        newPaymentStatus: newStatus,
      });
    }
  }

  return results;
}

/**
 * Aplica un pago dirigido según asignaciones previamente validadas.
 */
export function allocatePaymentDirected(
  totalAmount: number,
  allocations: { saleId: string; amount: number }[],
  sales: PendingSaleInput[]
): AllocationResult[] {
  const results: AllocationResult[] = [];

  for (const alloc of allocations) {
    const sale = sales.find((s) => s.id === alloc.saleId);
    if (!sale) {
      throw new Error(`La venta con ID ${alloc.saleId} no se encontró en la lista de ventas proporcionada.`);
    }

    const currentBalance = sale.remainingBalance ?? sale.totalAmount;
    const amountApplied = alloc.amount;
    const newBalance = Math.max(0, currentBalance - amountApplied);
    const newStatus: "PAID" | "PARTIAL" = newBalance === 0 ? "PAID" : "PARTIAL";

    results.push({
      saleId: alloc.saleId,
      amountApplied,
      newRemainingBalance: newBalance,
      newPaymentStatus: newStatus,
    });
  }

  return results;
}

/**
 * Realiza las validaciones numéricas puras para el modo de asignación dirigida.
 */
export function validateDirectedAllocations(
  totalAmount: number,
  allocations: { saleId: string; amount: number }[],
  sales: PendingSaleInput[]
): { valid: boolean; error?: string } {
  if (allocations.length === 0) {
    return { valid: false, error: "No se proporcionaron asignaciones de pago." };
  }

  let totalAllocationsSum = 0;

  for (const alloc of allocations) {
    const sale = sales.find((s) => s.id === alloc.saleId);
    if (!sale) {
      return {
        valid: false,
        error: `La venta ${alloc.saleId} no existe en la lista provista.`,
      };
    }

    const currentBalance = sale.remainingBalance ?? sale.totalAmount;
    if (alloc.amount > currentBalance + 0.001) {
      return {
        valid: false,
        error: `El abono asignado (S/ ${alloc.amount}) excede el saldo pendiente (S/ ${currentBalance}) de la venta ${alloc.saleId}.`,
      };
    }

    totalAllocationsSum += alloc.amount;
  }

  if (Math.abs(totalAllocationsSum - totalAmount) > 0.01) {
    return {
      valid: false,
      error: `La suma de asignaciones (S/ ${totalAllocationsSum.toFixed(2)}) no coincide con el monto total pagado (S/ ${totalAmount.toFixed(2)}).`,
    };
  }

  return { valid: true };
}
