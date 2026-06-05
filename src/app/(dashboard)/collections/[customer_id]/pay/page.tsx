import { customerRepository } from "@/services/repositories/customerRepository";
import { salesRepository } from "@/services/repositories/salesRepository";
import { adminDb } from "@/services/firebase/admin";
import { notFound, redirect } from "next/navigation";
import { PaymentForm } from "./PaymentForm";
import { PaymentHistoryList } from "./PaymentHistoryList"; // Asegúrate de tener esta importación
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { serializeFirestoreData } from "@/services/firebase/serialization";

export default async function CustomerPaymentPage({
  params,
}: {
  params: Promise<{ customer_id: string }>;
}) {
  const resolvedParams = await params;
  const customerId = resolvedParams.customer_id;

  // 1. Obtenemos toda la data en paralelo para mayor velocidad
  const [customer, pendingSales, paymentHistory, usersSnapshot] =
    await Promise.all([
      customerRepository.getCustomerById(customerId),
      salesRepository.getPendingSalesByCustomer(customerId),
      salesRepository.getCustomerPaymentHistory(customerId),
      adminDb.collection("users").where("isActive", "==", true).get(),
    ]);

  if (!customer) {
    notFound();
  }

  // Si su deuda es 0, lo regresamos (Opcional: puedes quitar esto si quieres ver el historial de un cliente en 0)
  if ((customer.debtAmount || 0) <= 0) {
    redirect("/collections");
  }

  // 2. Serializamos usuarios
  const users = usersSnapshot.docs.map((doc) => {
    return serializeFirestoreData({
      id: doc.id,
      ...doc.data(),
    });
  });

  return (
    // CAMBIO CLAVE: max-w-7xl para más anchura, mx-auto para centrar.
    <div className="max-w-7xl mx-auto pb-10 pt-4 px-4 sm:px-6 space-y-8">
      {/* BOTÓN DE VOLVER */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="rounded-full bg-white shadow-sm border border-slate-200 hover:bg-slate-50"
        >
          <Link href="/collections">
            <ChevronLeft className="h-5 w-5 text-slate-600" />
          </Link>
        </Button>
        <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">
          Volver a Cobranzas
        </span>
      </div>

      {/* CONTENEDORES APILADOS SIN CUADRÍCULA EXTERIOR */}
      <div className="space-y-8">
        <PaymentForm
          customer={customer}
          users={users}
          pendingSales={pendingSales}
        />

        {/* Envolvemos el historial en un max-w-6xl para que su ancho coincida perfectamente con el del PaymentForm */}
        <div className="max-w-6xl mx-auto w-full">
          <PaymentHistoryList payments={paymentHistory} />
        </div>
      </div>
    </div>
  );
}
