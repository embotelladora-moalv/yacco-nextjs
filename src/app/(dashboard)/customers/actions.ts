"use server";

import { customerRepository } from "@/services/repositories/customerRepository";
import {
  customerSchema,
  CustomerFormValues,
} from "@/core/validations/crmSchemas";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

export async function saveCustomerAction(
  data: CustomerFormValues,
  id?: string,
) {
  try {
    // 1. Validación estricta con Zod
    const parsedData = customerSchema.parse(data);

    // 2. Garantizar que toda ubicación tenga un ID único antes de ir a BD
    const locationsWithIds = parsedData.locations.map((loc) => ({
      ...loc,
      id: loc.id || randomUUID(), // Genera un ID si viene undefined del formulario
    }));

    // Preparamos la data limpia que coincide exactamente con la Entidad
    const dataToSave = {
      ...parsedData,
      locations: locationsWithIds,
    };

    // 3. Ejecutar Creación o Edición
    if (id) {
      await customerRepository.updateCustomer(id, dataToSave);
    } else {
      await customerRepository.createCustomer(dataToSave);
    }

    // 4. Limpiar caché para que la tabla se actualice al instante
    revalidatePath("/customers");
    return { success: true };
  } catch (error: any) {
    console.error("Error al guardar cliente:", error);
    return { success: false, error: error.message };
  }
}

export async function toggleCustomerStatusAction(
  id: string,
  isActive: boolean,
) {
  try {
    await customerRepository.toggleCustomerStatus(id, isActive);
    revalidatePath("/customers");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
