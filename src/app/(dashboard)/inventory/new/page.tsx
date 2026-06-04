import { settingsRepository } from "@/services/repositories/settingsRepository";
import { ProductForm } from "../ProductForm";

export default async function NewProductPage() {
  const settings = await settingsRepository.getSettings();

  return (
    <div className="pb-10 pt-6 px-4 sm:px-0">
      <ProductForm
        packagingTypes={settings.packagingTypes}
        maquilaBrands={settings.maquilaBrands || []}
      />{" "}
    </div>
  );
}
