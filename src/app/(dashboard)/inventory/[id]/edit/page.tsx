import { inventoryRepository } from "@/services/repositories/inventoryRepository";
import { settingsRepository } from "@/services/repositories/settingsRepository";
import { ProductForm } from "../../ProductForm"; // Ajusta la ruta si es necesario
import { notFound } from "next/navigation";

// 1. Envolvemos el tipo de params en una Promise
export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // 2. Desempaquetamos (unwrap) los parámetros con await
  const resolvedParams = await params;

  const products = await inventoryRepository.getAllProducts();

  // 3. Ahora usamos resolvedParams.id de forma segura
  const productToEdit = products.find((p) => p.id === resolvedParams.id);

  const settings = await settingsRepository.getSettings();

  if (!productToEdit) {
    notFound();
  }

  const initialData = {
    ...productToEdit,
    initialStockEmpty: productToEdit.stockEmpty,
    initialStockFilled: productToEdit.stockFilled,
  };

  return (
    <div className="pb-10 pt-6 px-4 sm:px-0">
      <div className="max-w-4xl mx-auto mb-4">
        <h1 className="text-xl font-bold text-slate-500">
          Editando Producto: {productToEdit.sku}
        </h1>
      </div>
      <ProductForm
        packagingTypes={settings.packagingTypes || []}
        initialData={initialData}
      />
    </div>
  );
}
