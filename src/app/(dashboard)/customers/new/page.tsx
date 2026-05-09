import { categoryRepository } from "@/services/repositories/categoryRepository";
import { CustomerNewClient } from "./CustomerNewClient";

export default async function NewCustomerPage() {
  // Cargamos las categorías desde Firestore en el servidor
  const categories = await categoryRepository.getActiveCategories();

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50/50 pb-10">
      <CustomerNewClient categories={categories} />
    </div>
  );
}
