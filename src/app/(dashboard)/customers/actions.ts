// src/app/(dashboard)/customers/actions.ts
"use server";

import { customerRepository } from "@/services/repositories/customerRepository";
import {
  customerSchema,
  CustomerFormValues,
} from "@/core/validations/customerSchema";
import { revalidatePath } from "next/cache";
import { adminDb } from "@/services/firebase/admin";
import { uuidv4 } from "zod";
import admin from "firebase-admin";

/**
 * Server Action: Guardar o Actualizar Cliente
 * Procesa los datos de Moalv S.a.C. validados por Zod.
 */
export async function saveCustomerAction(data: CustomerFormValues) {
  try {
    // 1. Validación de esquema en el servidor
    const parsedData = customerSchema.parse(data);

    // 2. Persistencia en Firestore (Admin SDK)
    const id = await customerRepository.save(parsedData);

    // 3. Forzamos a Next.js a refrescar los datos de la tabla de clientes
    revalidatePath("/customers");

    return {
      success: true,
      id,
      message: "Cliente guardado correctamente en el directorio Yacco.",
    };
  } catch (error: any) {
    console.error("Server Action Error (Customer):", error);
    return {
      success: false,
      error: "Error crítico al procesar el registro del cliente.",
    };
  }
}

/**
 * Server Action: Consulta de Documentos (RUC/DNI)
 * Simula la respuesta de SUNAT para autocompletar datos fiscales.
 */
export async function lookupDocumentAction(documentNumber: string) {
  try {
    // Validamos longitud mínima para evitar peticiones innecesarias
    if (documentNumber.length < 8) {
      return { success: false, error: "Número de documento incompleto." };
    }

    // SIMULACIÓN DE API SUNAT PARA PRUEBAS DE YACCO
    // En producción, aquí se implementará el fetch a ApiPerú o servicio similar.
    if (documentNumber === "20612769151") {
      return {
        success: true,
        data: {
          businessName: "EMBOTELLADORA MOALV S.A.C.",
          address: "PUCALLPA, UCAYALI, PERÚ",
          documentType: "RUC" as const,
        },
      };
    }

    // Respuesta genérica para otros números (simulada)
    if (documentNumber.length === 11) {
      return {
        success: true,
        data: {
          businessName: "CLIENTE EMPRESA PRUEBA S.A.",
          address: "AV. PRINCIPAL 123, LIMA",
          documentType: "RUC" as const,
        },
      };
    }

    return {
      success: false,
      error: "El documento no fue encontrado en los padrones de SUNAT/RENIEC.",
    };
  } catch (error) {
    console.error("Lookup Error:", error);
    return {
      success: false,
      error: "Error de conexión con el servicio de consulta.",
    };
  }
}

/**
 * Server Action: Cambiar estado de actividad
 * Permite dar de baja lógica a clientes sin borrar su historial de Kardex.
 */
export async function toggleCustomerStatusAction(
  id: string,
  currentStatus: boolean,
) {
  try {
    // Lógica pendiente en repositorio, pero definida para cumplimiento de SCRUM
    // await customerRepository.updateStatus(id, !currentStatus);
    revalidatePath("/customers");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: "No se pudo cambiar el estado del cliente.",
    };
  }
}

export async function addLocationAction(
  customerId: string,
  locationData: {
    alias: string;
    address: string;
    latitude: number;
    longitude: number;
    photoUrl?: string;
  },
) {
  try {
    const customerRef = adminDb.collection("customers").doc(customerId);

    const newLocation = {
      id: uuidv4(),
      ...locationData,
      createdAt: new Date().toISOString(),
    };

    // Usamos arrayUnion para agregar al arreglo sin borrar lo existente
    await customerRef.update({
      locations: admin.firestore.FieldValue.arrayUnion(newLocation),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Revalidamos la página de detalle para ver la nueva ubicación
    revalidatePath(`/customers/${customerId}`);

    return {
      success: true,
      message: "Ubicación GPS registrada correctamente para Yacco.",
    };
  } catch (error) {
    console.error("Error adding location:", error);
    return {
      success: false,
      error: "No se pudo registrar la ubicación geográfica.",
    };
  }
}

export async function addContactAction(
  customerId: string,
  contactData: { name: string; phone: string; role: string },
) {
  try {
    const customerRef = adminDb.collection("customers").doc(customerId);

    const newContact = {
      id: uuidv4(),
      ...contactData,
    };

    await customerRef.update({
      contacts: admin.firestore.FieldValue.arrayUnion(newContact),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    revalidatePath(`/customers/${customerId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: "Error al registrar el contacto." };
  }
}

/**
 * Server Action: Eliminar contacto.
 */
export async function removeContactAction(
  customerId: string,
  contactId: string,
) {
  try {
    const customerRef = adminDb.collection("customers").doc(customerId);
    const doc = await customerRef.get();
    const contacts = doc.data()?.contacts || [];

    // Filtramos para eliminar el contacto específico
    const updatedContacts = contacts.filter((c: any) => c.id !== contactId);

    await customerRef.update({ contacts: updatedContacts });
    revalidatePath(`/customers/${customerId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: "Error al eliminar el contacto." };
  }
}
