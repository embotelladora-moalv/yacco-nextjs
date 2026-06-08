import { inventoryRepository } from "@/services/repositories/inventoryRepository";
import { settingsRepository } from "@/services/repositories/settingsRepository";
import { InventoryDashboard } from "./InventoryDashboard";

export const dynamic = "force-dynamic"; // Para asegurar que siempre traiga el stock más fresco

export default async function InventoryPage() {
  const [products, batches, settings] = await Promise.all([
    inventoryRepository.getAllProducts(),
    inventoryRepository.getActiveBatches(),
    settingsRepository.getSettings(),
  ]);

  const plantWasteReasons = (settings.productionWasteReasons || []).filter(r => r.isActive);

  return (
    <div className="max-w-[1400px] mx-auto pb-10 pt-4 px-4 sm:px-6">
      <InventoryDashboard 
        products={products} 
        batches={batches}
        wasteReasons={plantWasteReasons}
      />
    </div>
  );
}
