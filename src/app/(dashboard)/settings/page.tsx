import { settingsRepository } from "@/services/repositories/settingsRepository";
import { Settings } from "lucide-react";
import { SettingsManager } from "./SettingsManager";
import { DangerZoneSection } from "./DangerZoneSection";

export default async function SettingsPage() {
  const settings = await settingsRepository.getSettings();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 px-4 sm:px-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <Settings className="h-8 w-8 text-blue-600" />
            Ajustes del Sistema
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Gestione catálogos, motivos de merma, etiquetas y parámetros
            globales de Moalv S.a.C.
          </p>
        </div>
      </div>

      <SettingsManager settings={settings} />
      <DangerZoneSection />
    </div>
  );
}
