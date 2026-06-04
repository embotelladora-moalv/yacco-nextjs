// src/app/customers/actions.ts
"use server";

import { customerRepository } from "@/services/repositories/customerRepository";
import {
  customerSchema,
  CustomerFormValues,
} from "@/core/validations/crmSchemas";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
// IMPORTANTE: Asegúrate de importar tu configuración de admin
import { adminStorage } from "@/services/firebase/admin";

export async function saveCustomerAction(
  data: CustomerFormValues,
  id?: string,
) {
  try {
    // 1. Validación estricta con Zod
    const parsedData = customerSchema.parse(data);

    // 2. Garantizar ID único y SUBIR IMÁGENES AL STORAGE
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    if (!bucketName)
      throw new Error("Falta definir FIREBASE_STORAGE_BUCKET en el .env");
    const bucket = adminStorage.bucket(bucketName);

    const locationsWithIds = await Promise.all(
      parsedData.locations.map(async (loc) => {
        let finalImageUrl = loc.imageUrl;

        // Si la imagen viene en Base64 desde el formulario (comprimida)
        if (finalImageUrl && finalImageUrl.startsWith("data:image")) {
          // Extraemos la data cruda quitando el prefijo
          const base64Data = finalImageUrl.split(",")[1];
          const buffer = Buffer.from(base64Data, "base64");

          // Generamos un nombre único en la carpeta de Storage
          const fileName = `customers/locations/${randomUUID()}.jpg`;
          const file = bucket.file(fileName);

          // Subimos el archivo
          await file.save(buffer, {
            metadata: { contentType: "image/jpeg" },
          });

          // Reemplazamos el Base64 por la ruta limpia del archivo
          finalImageUrl = fileName;
        }

        const lat = loc.coordinates?.lat ?? loc.latitude;
        const lng = loc.coordinates?.lng ?? loc.longitude;

        let geoSource = loc.geoSource;
        let geoStatus = loc.geoStatus;

        if (loc.coordinates) {
          if (loc.latitude !== loc.coordinates.lat || loc.longitude !== loc.coordinates.lng) {
            geoSource = "manual";
            geoStatus = "OK";
          }
        }

        return {
          ...loc,
          imageUrl: finalImageUrl,
          id: loc.id || randomUUID(), // Genera un ID si viene undefined del formulario
          latitude: lat,
          longitude: lng,
          geoSource,
          geoStatus,
        };
      }),
    );

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

export async function addContactAction(
  customerId: string,
  contact: { name: string; phone: string; role: string },
) {
  try {
    const { randomUUID } = await import("crypto");
    const customer = await customerRepository.getCustomerById(customerId);
    if (!customer) return { success: false, error: "Cliente no encontrado" };
    const contacts = (customer as any).contacts ?? [];
    contacts.push({ ...contact, id: randomUUID() });
    await customerRepository.updateCustomer(customerId, { contacts } as any);
    revalidatePath(`/customers/${customerId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function removeContactAction(customerId: string, contactId: string) {
  try {
    const customer = await customerRepository.getCustomerById(customerId);
    if (!customer) return { success: false, error: "Cliente no encontrado" };
    const contacts = ((customer as any).contacts ?? []).filter(
      (c: any) => c.id !== contactId,
    );
    await customerRepository.updateCustomer(customerId, { contacts } as any);
    revalidatePath(`/customers/${customerId}`);
    return { success: true };
  } catch (error: any) {
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
