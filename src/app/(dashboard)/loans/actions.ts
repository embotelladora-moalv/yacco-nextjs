"use server";

import { routeLoadRepository } from "@/services/repositories/routeLoadRepository";
import {
  routeLoadSchema,
  RouteLoadFormValues,
} from "@/core/validations/routeLoadSchema";
import { revalidatePath } from "next/cache";

type ActionResponse = { success: boolean; error?: string };

export async function submitTruckLoadAction(
  data: RouteLoadFormValues,
): Promise<ActionResponse> {
  try {
    const parsedData = routeLoadSchema.parse(data);

    // Aquí pasarías el ID del usuario logueado en sesión (por ahora hardcodeado)
    const currentUserId = "USER_EN_SESION";

    await routeLoadRepository.loadTruckTransaction(parsedData, currentUserId);

    revalidatePath("/routes");
    revalidatePath("/products"); // Refresca la tabla de productos para ver el nuevo stock

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Error al cargar el camión.",
    };
  }
}
