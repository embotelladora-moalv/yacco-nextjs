"use server";

import { customerRepository } from "@/services/repositories/customerRepository";
import {
  customerSchema,
  CustomerFormValues,
} from "@/core/validations/customerSchema";
import { revalidatePath } from "next/cache";

export type ActionResponse = { success: boolean; error?: string };

export async function saveCustomerAction(
  data: CustomerFormValues,
): Promise<ActionResponse> {
  try {
    const parsedData = customerSchema.parse(data);
    await customerRepository.create(parsedData);

    revalidatePath("/customers");
    revalidatePath("/customers/map"); // Refresca el mapa si hay nuevas ubicaciones

    return { success: true };
  } catch (error: any) {
    console.error("Error saving customer:", error);
    return { success: false, error: "Error al registrar el cliente." };
  }
}

export async function updateCustomerAction(
  id: string,
  data: CustomerFormValues,
): Promise<ActionResponse> {
  try {
    const parsedData = customerSchema.parse(data);
    await customerRepository.update(id, parsedData);

    revalidatePath("/customers");
    revalidatePath("/customers/map");

    return { success: true };
  } catch (error: any) {
    console.error("Error updating customer:", error);
    return {
      success: false,
      error: "Error al actualizar los datos del cliente.",
    };
  }
}

export async function deleteCustomerAction(
  id: string,
): Promise<ActionResponse> {
  try {
    await customerRepository.deactivate(id);
    revalidatePath("/customers");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Error al dar de baja al cliente." };
  }
}
