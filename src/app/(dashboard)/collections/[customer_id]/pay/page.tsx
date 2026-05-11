import { customerRepository } from "@/services/repositories/customerRepository";
import { adminDb } from "@/services/firebase/admin";
import { notFound, redirect } from "next/navigation";
import { PaymentForm } from "./PaymentForm";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default async function CustomerPaymentPage({
  params,
}: {
  params: Promise<{ customer_id: string }>;
}) {
  const resolvedParams = await params;
  const customerId = resolvedParams.customer_id;

  // 1. Obtenemos al cliente
  const customer = await customerRepository.getCustomerById(customerId);

  if (!customer) {
    notFound();
  }

  // Si su deuda es 0, no hay nada que cobrar, lo regresamos
  if ((customer.debtAmount || 0) <= 0) {
    redirect("/collections");
  }

  // 2. Obtenemos a los usuarios (Cajeros/Administradores)
  const usersSnapshot = await adminDb
    .collection("users")
    .where("isActive", "==", true)
    .get();
  const users = usersSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
  })) as any[];

  return (
    <div className="max-w-[1400px] mx-auto pb-10 pt-4 px-4 sm:px-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="rounded-full bg-white shadow-sm border border-slate-200"
        >
          <Link href="/collections">
            <ChevronLeft className="h-5 w-5 text-slate-600" />
          </Link>
        </Button>
        <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">
          Volver a Cobranzas
        </span>
      </div>

      <PaymentForm customer={customer} users={users} />
    </div>
  );
}
