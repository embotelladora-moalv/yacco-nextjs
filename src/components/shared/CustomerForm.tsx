"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  customerSchema,
  CustomerFormValues,
} from "@/core/validations/customerSchema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { lookupDocumentAction } from "@/app/(dashboard)/customers/actions";

export function CustomerForm({ categories, onSubmitAction, isLoading }: any) {
  const [isSearching, setIsSearching] = useState(false);
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      documentType: "RUC",
      documentNumber: "",
      businessName: "",
      alias: "",
      legalAddress: "",
      categoryTag: "",
    },
  });

  const handleLookup = async () => {
    const doc = form.getValues("documentNumber");
    if (doc.length < 8) return toast.error("Documento insuficiente");
    setIsSearching(true);
    const res = await lookupDocumentAction(doc);
    setIsSearching(false);
    if (res.success) {
      form.setValue("businessName", res.data!.businessName);
      form.setValue("legalAddress", res.data!.address);
      if (!form.getValues("alias"))
        form.setValue("alias", res.data!.businessName);
      toast.success("Datos de SUNAT cargados");
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmitAction)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>RUC / DNI</Label>
          <div className="flex gap-2">
            <Input
              {...form.register("documentNumber")}
              placeholder="20612769151"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleLookup}
              disabled={isSearching}
            >
              {isSearching ? (
                <Loader2 className="animate-spin h-4 w-4" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Zona / Categoría (Gestionable)</Label>
          <select
            {...form.register("categoryTag")}
            className="w-full h-10 px-3 rounded-md border text-sm bg-white"
          >
            <option value="">Seleccione zona...</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2 space-y-2">
          <Label>Razón Social (Legal)</Label>
          <Input
            {...form.register("businessName")}
            placeholder="Nombre legal ante SUNAT"
          />
        </div>

        <div className="md:col-span-2 space-y-2">
          <Label>Nombre Comercial / Alias</Label>
          <Input
            {...form.register("alias")}
            placeholder="Ej: Bodega Don Lucho"
            className="bg-blue-50/30"
          />
        </div>

        <div className="md:col-span-2 space-y-2">
          <Label>Dirección Fiscal</Label>
          <Input {...form.register("legalAddress")} />
        </div>
      </div>

      <Button
        type="submit"
        className="w-full bg-blue-700 hover:bg-blue-800"
        disabled={isLoading}
      >
        <Save className="mr-2 h-4 w-4" /> Guardar en Directorio Yacco
      </Button>
    </form>
  );
}
