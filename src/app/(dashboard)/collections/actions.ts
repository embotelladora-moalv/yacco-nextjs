"use server";

import {
  paymentSchema,
  PaymentFormValues,
} from "@/core/validations/paymentSchema";
import { revalidatePath } from "next/cache";
import { adminAuth } from "@/services/firebase/admin";
import { salesRepository } from "@/services/repositories/salesRepository";
import { cookies } from "next/headers";

export async function registerPaymentAction(data: PaymentFormValues) {
  try {
    const parsedData = paymentSchema.parse(data);

    // Aquí usarías el ID de la sesión real. Lo hardcodeamos por ahora.
    const userId = "ADMIN_SYS";

    await salesRepository.registerPayment(parsedData);

    // Refrescamos clientes y pedidos porque sus estados financieros cambiaron
    revalidatePath("/customers");
    revalidatePath("/orders");
    revalidatePath("/collections");

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Error al registrar el pago.",
    };
  }
}

export async function cancelPaymentAction(
  paymentId: string,
  customerId: string,
) {
  try {
    // 1. Auditoría: ¿Quién está anulando?
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("yacco_session")?.value;

    if (!sessionCookie) throw new Error("Sesión inválida.");
    const decodedClaims = await adminAuth.verifySessionCookie(
      sessionCookie,
      true,
    );
    const adminUid = decodedClaims.uid;

    // 2. Ejecutar la transacción maestra
    await salesRepository.cancelPayment(paymentId, adminUid);

    // 3. Limpiar la caché de Next.js para que la pantalla se actualice al instante
    revalidatePath("/collections");
    revalidatePath(`/collections/${customerId}`);

    return { success: true };
  } catch (error: any) {
    console.error("Error al anular pago:", error);
    return { success: false, error: error.message };
  }
}
