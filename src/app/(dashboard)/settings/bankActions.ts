"use server";

import { bankRepository } from "@/services/repositories/bankRepository";
import { getUserSession } from "@/services/firebase/auth";
import { revalidatePath } from "next/cache";

async function verifyAdmin() {
  const session = await getUserSession();
  if (!session || !session.roles.includes("ADMIN")) {
    throw new Error("No autorizado.");
  }
}

export async function createBankAction(name: string, accountNumber?: string) {
  try {
    await verifyAdmin();

    if (!name || name.trim() === "") {
      throw new Error("El nombre del banco es obligatorio.");
    }

    await bankRepository.createBank(name.trim(), accountNumber?.trim() || undefined);

    revalidatePath("/settings");
    revalidatePath("/collections");

    return { success: true };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Error al crear el banco.";
    return { success: false, error: errMsg };
  }
}

export async function updateBankAction(id: string, name: string, accountNumber?: string) {
  try {
    await verifyAdmin();

    if (!name || name.trim() === "") {
      throw new Error("El nombre del banco es obligatorio.");
    }

    await bankRepository.updateBank(id, {
      name: name.trim(),
      accountNumber: accountNumber?.trim() || undefined,
    });

    revalidatePath("/settings");
    revalidatePath("/collections");

    return { success: true };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Error al actualizar el banco.";
    return { success: false, error: errMsg };
  }
}

export async function toggleBankAction(id: string, activate: boolean) {
  try {
    await verifyAdmin();

    if (activate) {
      await bankRepository.activateBank(id);
    } else {
      await bankRepository.deactivateBank(id);
    }

    revalidatePath("/settings");
    revalidatePath("/collections");

    return { success: true };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Error al cambiar estado del banco.";
    return { success: false, error: errMsg };
  }
}
