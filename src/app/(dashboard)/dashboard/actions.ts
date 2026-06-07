import { salesRepository } from "@/services/repositories/salesRepository";

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
