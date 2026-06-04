"use server";

import { dailyRouteRepository } from "@/services/repositories/dailyRouteRepository";
import {
  dailyRouteSchema,
  DailyRouteFormValues,
} from "@/core/validations/dailyRouteSchema";
import { revalidatePath } from "next/cache";

type ActionResponse = { success: boolean; error?: string };

export async function openRouteAction(
  data: DailyRouteFormValues,
): Promise<ActionResponse> {
  try {
    const parsedData = dailyRouteSchema.parse(data);

    // Aquí podríamos validar si el camión ya tiene una ruta abierta hoy
    // para evitar que se asigne dos veces al mismo tiempo.

    await dailyRouteRepository.createRoute(parsedData);

    revalidatePath("/routes");
    return { success: true };
  } catch (error: any) {
    console.error("Error abriendo ruta:", error);
    return {
      success: false,
      error: "Error al registrar la salida del camión.",
    };
  }
}
