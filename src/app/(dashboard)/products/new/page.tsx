"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ProductForm } from "@/components/shared/ProductForm";
import { createProductAction } from "./actions";
import { ProductFormValues } from "@/core/validations/productSchema";

export default function NewProductPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (values: ProductFormValues) => {
    setIsLoading(true);

    const result = await createProductAction(values);

    setIsLoading(false);

    if (result.success) {
      // 2. Usamos toast.success en lugar de alert()
      toast.success("Producto registrado", {
        description: "El producto se ha guardado correctamente en el catálogo.",
      });

      router.push("/products");
    } else {
      // 3. Usamos toast.error para los fallos
      toast.error("Error al registrar", {
        description: result.error,
      });
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Nuevo Producto
        </h1>
        <p className="text-gray-500 mt-2">
          Registra un nuevo tipo de bidón, botella o caja para el catálogo de
          producción.
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <ProductForm onSubmitAction={handleSubmit} isLoading={isLoading} />
      </div>
    </div>
  );
}
