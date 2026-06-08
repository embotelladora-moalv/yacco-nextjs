"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  addCatalogItemAction,
  removeCatalogItemAction,
  updateShrinkageReasonAction,
} from "./actions";
import { createBankAction, toggleBankAction } from "./bankActions";
import { toast } from "sonner";
import { Trash2, Plus, Settings2, Building2, Recycle } from "lucide-react";
import {
  SystemSettings,
  ShrinkageReason,
} from "@/core/entities/SystemSettings";
import { Bank } from "@/core/entities/Bank";
import { slugifyReason } from "@/core/utils/dateUtils";

interface SettingsManagerProps {
  settings: SystemSettings;
  banks: Bank[];
}

export function SettingsManager({ settings, banks }: SettingsManagerProps) {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [submittingBank, setSubmittingBank] = useState(false);
  const [togglingBankId, setTogglingBankId] = useState<string | null>(null);

  const handleAddBank = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const bankName = formData.get("bankName") as string;
    const accountNumber = formData.get("accountNumber") as string;

    if (!bankName.trim()) return;

    setSubmittingBank(true);
    const result = await createBankAction(bankName, accountNumber);
    setSubmittingBank(false);

    if (result.success) {
      toast.success("Banco registrado exitosamente");
      (e.target as HTMLFormElement).reset();
    } else {
      toast.error(result.error || "Error al registrar el banco");
    }
  };

  const handleToggleBank = async (bankId: string, currentActive: boolean) => {
    setTogglingBankId(bankId);
    const result = await toggleBankAction(bankId, !currentActive);
    setTogglingBankId(null);

    if (result.success) {
      toast.success(currentActive ? "Banco desactivado" : "Banco activado");
    } else {
      toast.error(result.error || "Error al cambiar estado del banco");
    }
  };

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
      key: "packagingTypes",
      title: "Tipos de Empaque (Catálogo)",
      description: "Formatos de envases físicos (Ej: Bidón 20L, Botella 1L).",
    },
    {
      key: "maquilaBrands",
      title: "Marcas de Maquila",
      description: "Nombres de clientes externos para los que se envasa agua.",
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

  const isShrinkageCatalog = (key: string) =>
    key === "productionWasteReasons" || key === "routeWasteReasons";

  const handleAdd = async (
    e: React.FormEvent<HTMLFormElement>,
    catalogKey: keyof SystemSettings,
  ) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const itemName = formData.get("item") as string;
    const isRecyclable = formData.get("isRecyclable") === "on";

    if (!itemName.trim()) return;

    setLoadingKey(`add-${catalogKey}`);

    let payload: any = itemName;

    // Si es un catálogo de objetos, construimos el objeto
    if (isShrinkageCatalog(catalogKey)) {
      const context = catalogKey === "routeWasteReasons" ? "ROUTE" : "PLANT";
      payload = {
        id: `${context.toLowerCase()}-${slugifyReason(itemName)}`,
        name: itemName.trim(),
        context,
        phase: "FILLED",
        isRecyclableDefault: isRecyclable,
        isActive: true,
      };
    }

    const result = await addCatalogItemAction(catalogKey, payload);
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
    item: string | ShrinkageReason,
  ) => {
    const displayLabel = typeof item === "string" ? item : item.name;
    if (
      !confirm(
        `¿Eliminar "${displayLabel}"? Esto no afectará el historial pasado, pero ya no se podrá seleccionar.`,
      )
    )
      return;

    setLoadingKey(
      `remove-${typeof item === "string" ? item : item.id}`,
    );
    const result = await removeCatalogItemAction(catalogKey, item);
    setLoadingKey(null);

    if (result.success) {
      toast.success("Elemento eliminado");
    } else {
      toast.error(result.error);
    }
  };

  const handleToggleRecyclable = async (
    catalogKey: "productionWasteReasons" | "routeWasteReasons",
    reason: ShrinkageReason,
  ) => {
    setLoadingKey(`toggle-${reason.id}`);
    const result = await updateShrinkageReasonAction(catalogKey, {
      ...reason,
      isRecyclableDefault: !reason.isRecyclableDefault,
    });
    setLoadingKey(null);

    if (!result.success) {
      toast.error(result.error);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {catalogs.map((catalog) => (
        <div
          key={catalog.key}
          className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col"
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
            className="space-y-3 mb-6"
          >
            <div className="flex gap-2">
              <Input
                name="item"
                placeholder="Nombre del motivo..."
                className="h-10 border-slate-200 focus-visible:ring-blue-600 font-medium"
                disabled={loadingKey?.startsWith("add-")}
              />
              <Button
                type="submit"
                disabled={loadingKey?.startsWith("add-")}
                className="h-10 bg-blue-600 hover:bg-blue-700 font-bold px-4 shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {isShrinkageCatalog(catalog.key) && (
              <div className="flex items-center space-x-2 px-1">
                <Checkbox id={`recyclable-${catalog.key}`} name="isRecyclable" />
                <label
                  htmlFor={`recyclable-${catalog.key}`}
                  className="text-xs font-bold text-slate-500 cursor-pointer select-none"
                >
                  Reciclable por defecto (vuelve envase vacío)
                </label>
              </div>
            )}
          </form>

          <div className="flex flex-wrap gap-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar flex-1">
            {isShrinkageCatalog(catalog.key)
              ? (settings[catalog.key] as ShrinkageReason[]).map((reason) => (
                  <div
                    key={reason.id}
                    className="group relative bg-slate-50 border border-slate-200 rounded-2xl p-3 w-full flex items-center justify-between hover:bg-white hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleRecyclable(
                            catalog.key as any,
                            reason,
                          )
                        }
                        className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${
                          reason.isRecyclableDefault
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-slate-100 text-slate-400"
                        }`}
                        title={
                          reason.isRecyclableDefault
                            ? "Es reciclable"
                            : "No es reciclable"
                        }
                      >
                        <Recycle className="h-4 w-4" />
                      </button>
                      <div>
                        <p className="text-sm font-black text-slate-700 leading-tight">
                          {reason.name}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                          {reason.isRecyclableDefault
                            ? "Vuelve vacío"
                            : "Baja total"}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(catalog.key, reason)}
                      disabled={loadingKey === `remove-${reason.id}`}
                      className="h-8 w-8 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              : (settings[catalog.key] as string[]).map((item) => (
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

            {((settings[catalog.key] as any[]) || []).length === 0 && (
              <p className="text-xs text-slate-400 italic w-full text-center py-2">
                No hay elementos configurados
              </p>
            )}
          </div>
        </div>
      ))}

      {/* SECCIÓN DE BANCOS */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-start gap-3 mb-4 border-b border-slate-100 pb-4">
            <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-lg">
                Catálogo de Bancos
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-snug">
                Bancos de destino para transferencias y cobranzas.
              </p>
            </div>
          </div>

          <form onSubmit={handleAddBank} className="space-y-3 mb-6">
            <div className="flex gap-2">
              <Input
                name="bankName"
                placeholder="Nombre (Ej: BCP, Yape)..."
                className="h-10 border-slate-200 focus-visible:ring-blue-600 font-medium"
                required
                disabled={submittingBank}
              />
              <Input
                name="accountNumber"
                placeholder="Nº Cuenta (Opcional)..."
                className="h-10 border-slate-200 focus-visible:ring-blue-600 font-medium"
                disabled={submittingBank}
              />
              <Button
                type="submit"
                disabled={submittingBank}
                className="h-10 bg-blue-600 hover:bg-blue-700 font-bold px-4 flex-shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </form>

          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
            {banks.map((bank) => (
              <div
                key={bank.id}
                className={`flex justify-between items-center p-3 rounded-2xl border transition-all ${
                  bank.isActive
                    ? "bg-white border-slate-200"
                    : "bg-slate-50/50 border-slate-100 opacity-60"
                }`}
              >
                <div>
                  <p className="font-black text-slate-800 text-sm">
                    {bank.name}
                  </p>
                  {bank.accountNumber && (
                    <p className="text-xs text-slate-400 font-bold mt-0.5">
                      Cta: {bank.accountNumber}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleBank(bank.id, bank.isActive)}
                  disabled={togglingBankId === bank.id}
                  className={`text-xs font-bold px-3 py-1 rounded-full border transition-all ${
                    bank.isActive
                      ? "text-red-600 border-red-200 bg-red-50/50 hover:bg-red-50"
                      : "text-emerald-600 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50"
                  }`}
                >
                  {togglingBankId === bank.id
                    ? "..."
                    : bank.isActive
                    ? "Desactivar"
                    : "Activar"}
                </button>
              </div>
            ))}
            {banks.length === 0 && (
              <p className="text-xs text-slate-400 italic w-full text-center py-2">
                No hay bancos configurados
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
