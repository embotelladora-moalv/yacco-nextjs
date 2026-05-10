import { productRepository } from "@/services/repositories/productRepository";
import { ProductForm } from "../../new/ProductForm"; // Reutilizamos el formulario
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params;
  const product = await productRepository.getById(id);

  if (!product) notFound();

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/50 pb-10 pt-6 px-4">
      <div className="max-w-3xl mx-auto mb-6">
        <Link href="/products">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-slate-500 hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4" /> Volver al Catálogo
          </Button>
        </Link>
      </div>
      {/* Pasamos los datos iniciales al formulario */}
      <ProductForm initialData={product} />
    </div>
  );
}
