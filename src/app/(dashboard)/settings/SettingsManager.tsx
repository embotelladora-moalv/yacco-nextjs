"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { addCatalogItemAction, removeCatalogItemAction } from "./actions";
import { toast } from "sonner";
import { Trash2, Plus, Settings2 } from "lucide-react";
import { SystemSettings } from "@/core/entities/SystemSettings";

interface SettingsManagerProps {
  settings: SystemSettings;
}

export function SettingsManager({ settings }: SettingsManagerProps) {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  // Mapeo de las listas que vamos a gestionar
  const catalogs: {
    key: keyof SystemSettings;
    title: string;
    description: string;
  }[] = [
    {
      key: "clientTags",
      title: "Etiquetas de Clientes (Zonas/Tipos)",
      description: "Categorías para organizar clientes (Ej: Parque, VIP).",
    },
    {
      key: "productionWasteReasons",
      title: "Motivos de Merma (Producción)",
      description: "Razones por las que un bidón se descarta en planta.",
    },
    {
      key: "routeWasteReasons",
      title: "Motivos de Merma (Ruta)",
      description: "Razones por las que un bidón se daña durante el reparto.",
    },
    {
      key: "bottleChangeReasons",
      title: "Motivos de Cambio (Garantía)",
      description: "Razones de quejas de clientes (Ej: Caño roto, Derrame).",
    },
    {
      key: "debtReasons",
      title: "Motivos de Deuda Extra",
      description:
        "Razones para aplicar un cargo manual a la cuenta del cliente.",
    },
  ];

  const handleAdd = async (
    e: React.FormEvent<HTMLFormElement>,
    catalogKey: keyof SystemSettings,
  ) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const item = formData.get("item") as string;

    if (!item.trim()) return;

    setLoadingKey(`add-${catalogKey}`);
    const result = await addCatalogItemAction(catalogKey, item);
    setLoadingKey(null);

    if (result.success) {
      toast.success("Ajuste guardado");
      (e.target as HTMLFormElement).reset();
    } else {
      toast.error(result.error);
    }
  };

  const handleRemove = async (
    catalogKey: keyof SystemSettings,
    item: string,
  ) => {
    if (
      !confirm(
        `¿Eliminar "${item}"? Esto no afectará el historial pasado, pero ya no se podrá seleccionar.`,
      )
    )
      return;

    setLoadingKey(`remove-${item}`);
    const result = await removeCatalogItemAction(catalogKey, item);
    setLoadingKey(null);

    if (result.success) {
      toast.success("Elemento eliminado");
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {catalogs.map((catalog) => (
        <div
          key={catalog.key}
          className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm"
        >
          <div className="flex items-start gap-3 mb-4 border-b border-slate-100 pb-4">
            <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-lg">
                {catalog.title}
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-snug">
                {catalog.description}
              </p>
            </div>
          </div>

          <form
            onSubmit={(e) => handleAdd(e, catalog.key)}
            className="flex gap-2 mb-4"
          >
            <Input
              name="item"
              placeholder="Escriba un nuevo motivo..."
              className="h-10 border-slate-200 focus-visible:ring-blue-600 font-medium"
              disabled={loadingKey === `add-${catalog.key}`}
            />
            <Button
              type="submit"
              disabled={loadingKey === `add-${catalog.key}`}
              className="h-10 bg-blue-600 hover:bg-blue-700 font-bold px-4"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </form>

          <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
            {((settings[catalog.key] as string[]) || []).map((item) => (
              <Badge
                key={item}
                variant="secondary"
                className="bg-slate-50 border border-slate-200 text-slate-700 text-sm py-1.5 px-3 flex items-center gap-2 hover:bg-slate-100"
              >
                {item}
                <button
                  type="button"
                  onClick={() => handleRemove(catalog.key, item)}
                  disabled={loadingKey === `remove-${item}`}
                  className="text-slate-400 hover:text-red-500 transition-colors focus:outline-none"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </Badge>
            ))}
            {((settings[catalog.key] as string[]) || []).length === 0 && (
              <p className="text-xs text-slate-400 italic w-full text-center py-2">
                No hay elementos configurados
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
