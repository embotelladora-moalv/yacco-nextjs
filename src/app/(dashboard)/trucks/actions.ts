"use server";

import { truckRepository } from "@/services/repositories/truckRepository";
import { truckSchema, TruckFormValues } from "@/core/validations/truckSchema";
import { revalidatePath } from "next/cache";

export type ActionResponse = { success: boolean; error?: string };

export async function saveTruckAction(
  data: TruckFormValues,
): Promise<ActionResponse> {
  try {
    const parsed = truckSchema.parse(data);
    await truckRepository.create(parsed);
    revalidatePath("/trucks");
    return { success: true };
  } catch (e) {
    return { success: false, error: "Error al crear camión" };
  }
}

export async function updateTruckAction(
  id: string,
  data: TruckFormValues,
): Promise<ActionResponse> {
  try {
    const parsed = truckSchema.parse(data);
    await truckRepository.update(id, parsed);
    revalidatePath("/trucks");
    return { success: true };
  } catch (e) {
    return { success: false, error: "Error al actualizar" };
  }
}

export async function deleteTruckAction(id: string): Promise<ActionResponse> {
  try {
    await truckRepository.deactivate(id);
    revalidatePath("/trucks");
    return { success: true };
  } catch (e) {
    return { success: false, error: "Error al eliminar" };
  }
}
