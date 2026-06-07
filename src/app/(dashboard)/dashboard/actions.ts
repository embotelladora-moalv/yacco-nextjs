import { salesRepository } from "@/services/repositories/salesRepository";
import { customerRepository } from "@/services/repositories/customerRepository";

export async function getMonthlyRevenueAction(monthsBack = 6) {
  try {
    const data = await salesRepository.getMonthlyRevenue(monthsBack);
    
    // Serializar los datos para el cliente (ya son planos, pero aseguramos estructura)
    const serializedData = data.map(item => ({
      month: item.month,
      billed: Number(item.billed || 0),
      cash: Number(item.cash || 0),
      digital: Number(item.digital || 0)
    }));

    return { success: true, data: serializedData };
  } catch (error) {
    console.error("Error in getMonthlyRevenueAction:", error);
    return { success: false, error: "Error al obtener datos de ingresos mensuales" };
  }
}

export async function getProductSalesAction() {
  try {
    const data = await salesRepository.getProductSalesCurrentMonth();
    return { success: true, data };
  } catch (error) {
    console.error("Error in getProductSalesAction:", error);
    return { success: false, error: "Error al obtener las ventas por producto del mes actual" };
  }
}

export async function getTopDebtorsAction() {
  try {
    const data = await customerRepository.getTopDebtors(10);
    return { success: true, data };
  } catch (error) {
    console.error("Error in getTopDebtorsAction:", error);
    return { success: false, error: "Error al obtener top deudores" };
  }
}

export async function getTopCustomersByVolumeAction() {
  try {
    const data = await salesRepository.getTopCustomersByVolumeCurrentMonth(10);
    return { success: true, data };
  } catch (error) {
    console.error("Error in getTopCustomersByVolumeAction:", error);
    return { success: false, error: "Error al obtener top clientes del mes" };
  }
}


