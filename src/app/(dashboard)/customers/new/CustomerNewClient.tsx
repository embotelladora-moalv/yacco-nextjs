"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CustomerForm } from "@/components/shared/CustomerForm";
import { saveCustomerAction } from "../actions";
import { CustomerFormValues } from "@/core/validations/customerSchema";
import { toast } from "sonner";
import { ChevronLeft, UserPlus, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Props {
  categories: any[];
}

export function CustomerNewClient({ categories }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (values: CustomerFormValues) => {
    setIsLoading(true);
    const result = await saveCustomerAction(values);
    setIsLoading(false);

    if (result.success) {
      toast.success("¡Cliente registrado!", {
        description: `${values.alias} ya está en el directorio de Yacco.`,
      });
      router.push("/customers");
      router.refresh();
    } else {
      toast.error("Error", { description: result.error });
    }
  };

  return (
    <div className="max-w-3xl mx-auto pt-8 px-4">
      {/* --- NAVEGACIÓN Y TÍTULO --- */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/customers">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-white shadow-sm border"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900">
              Nuevo Cliente
            </h1>
            <p className="text-xs font-bold text-blue-700 uppercase tracking-widest">
              Embotelladora Moalv S.a.C.
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
          <ShieldCheck className="h-4 w-4 text-blue-700" />
          <span className="text-[10px] font-bold text-blue-700 uppercase">
            Validación SUNAT Activa
          </span>
        </div>
      </div>

      {/* --- CONTENEDOR PRINCIPAL (Interfaz Moderna) --- */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-blue-900/5 overflow-hidden">
        {/* Decoración superior */}
        <div className="h-2 bg-gradient-to-r from-blue-700 via-blue-500 to-blue-700" />

        <div className="p-8 md:p-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <UserPlus className="h-6 w-6 text-blue-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Información del Cliente
              </h2>
              <p className="text-sm text-gray-500">
                Complete los datos para la facturación y logística.
              </p>
            </div>
          </div>

          {/* Formulario que ya construimos */}
          <CustomerForm
            categories={categories}
            onSubmitAction={handleSubmit}
            isLoading={isLoading}
          />
        </div>

        {/* Footer del Formulario */}
        <div className="bg-gray-50 px-8 py-4 border-t flex justify-between items-center">
          <p className="text-[10px] text-gray-400 font-medium italic">
            * Los datos fiscales serán validados contra el padrón RUC.
          </p>
          <span className="text-[10px] font-bold text-gray-400">
            YACCO v1.0
          </span>
        </div>
      </div>

      {/* Sugerencia rápida */}
      <div className="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
        <div className="h-5 w-5 rounded-full bg-amber-200 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[10px] font-bold text-amber-700">!</span>
        </div>
        <p className="text-xs text-amber-800 leading-relaxed">
          <strong>Consejo Yacco:</strong> Use el <strong>Alias</strong> para
          nombres comunes como "Bodega El Parque" para que los choferes los
          identifiquen rápidamente en la ruta.
        </p>
      </div>
    </div>
  );
}
