"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  customerSchema,
  CustomerFormValues,
} from "@/core/validations/crmSchemas";
import { saveCustomerAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Building2,
  MapPin,
  Phone,
  User,
  Save,
  Plus,
  Trash2,
  Tag,
  FileText,
  CheckCircle2,
  MapIcon,
  Crosshair,
} from "lucide-react";
import dynamic from "next/dynamic";

interface CustomerFormProps {
  initialData?: any;
}

const MapPicker = dynamic(() => import("./MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-[250px] w-full bg-slate-100 animate-pulse rounded-xl flex items-center justify-center text-slate-400 font-bold">
      Cargando mapa...
    </div>
  ),
});

export function CustomerForm({ initialData }: CustomerFormProps) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const [tagsInput, setTagsInput] = useState(
    initialData?.tags?.join(", ") || "",
  );

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema) as any,
    defaultValues: initialData || {
      name: "",
      alias: "",
      documentType: "DNI",
      documentNumber: "",
      contactName: "",
      contactPhone: "",
      tags: [],
      locations: [
        {
          name: "Sede Principal",
          address: "",
          reference: "",
          contactName: "",
          contactPhone: "",
          isMain: true,
        },
      ],
    },
  });

  const {
    fields: locationFields,
    append: appendLocation,
    remove: removeLocation,
  } = useFieldArray({
    control: form.control,
    name: "locations",
  });

  const onSubmit = async (values: CustomerFormValues) => {
    setIsPending(true);
    const tagsArray = tagsInput
      .split(",")
      .map((t: string) => t.trim())
      .filter((t: string) => t !== "");
    const finalData = { ...values, tags: tagsArray };

    if (!finalData.locations.some((loc) => loc.isMain)) {
      finalData.locations[0].isMain = true;
    }

    const result = await saveCustomerAction(finalData, initialData?.id);
    setIsPending(false);

    if (result.success) {
      toast.success(
        initialData
          ? "Cliente actualizado exitosamente"
          : "Cliente registrado con éxito",
      );
      router.push("/customers");
      router.refresh();
    } else {
      toast.error("Error al guardar", { description: result.error });
    }
  };

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden max-w-5xl mx-auto">
      <div className="bg-slate-900 p-8 text-white flex items-center gap-4">
        <Building2 className="h-8 w-8 text-blue-400" />
        <div>
          <h2 className="text-2xl font-black tracking-tight">
            {initialData ? "Editar Cliente" : "Registrar Nuevo Cliente"}
          </h2>
          <p className="text-slate-300 font-medium text-sm mt-0.5">
            Cuentas corrientes, facturación y múltiples sedes de entrega.
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-10">
        {/* SECCIÓN 1: DATOS GENERALES DEL CLIENTE */}
        <div className="space-y-4">
          <h3 className="text-base font-black tracking-widest text-slate-800 uppercase flex items-center gap-2 border-b border-slate-100 pb-2">
            <User className="h-5 w-5 text-blue-600" /> 1. Datos de Facturación /
            Generales
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <div className="space-y-2 md:col-span-2">
              <Label className="font-bold text-slate-700">
                Razón Social o Nombre Completo *
              </Label>
              <Input
                {...form.register("name")}
                placeholder="Ej: Inversiones Los Pinos S.A.C."
                className="h-11 border-slate-200"
              />
              {form.formState.errors.name && (
                <p className="text-xs text-red-500 font-bold">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                Alias (Nombre Comercial)
              </Label>
              <Input
                {...form.register("alias")}
                placeholder="Ej: Bodega Doña María"
                className="h-11 border-slate-200"
              />
            </div>

            <div className="flex gap-4">
              <div className="space-y-2 w-1/3">
                <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1">
                  <FileText className="h-3 w-3" /> Doc.
                </Label>
                <select
                  {...form.register("documentType")}
                  className="w-full h-11 px-3 rounded-md border border-slate-200 bg-white font-medium"
                >
                  <option value="DNI">DNI</option>
                  <option value="RUC">RUC</option>
                  <option value="OTHER">Otro</option>
                </select>
              </div>
              <div className="space-y-2 flex-1">
                <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                  Número de Documento *
                </Label>
                <Input
                  {...form.register("documentNumber")}
                  placeholder="Ej: 20600000001"
                  className="h-11 border-slate-200 font-black"
                />
                {form.formState.errors.documentNumber && (
                  <p className="text-xs text-red-500 font-bold">
                    {form.formState.errors.documentNumber.message}
                  </p>
                )}
              </div>
            </div>

            {/* NUEVOS CAMPOS: CONTACTO PRINCIPAL */}
            <div className="space-y-2">
              <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1">
                <User className="h-3 w-3 text-emerald-500" /> Contacto Principal
                (Cobranzas)
              </Label>
              <Input
                {...form.register("contactName")}
                placeholder="Nombre del dueño o gerente..."
                className="h-11 border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1">
                <Phone className="h-3 w-3 text-emerald-500" /> Celular Principal
              </Label>
              <Input
                {...form.register("contactPhone")}
                placeholder="Nº celular directo"
                className="h-11 border-slate-200 font-medium"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1">
                <Tag className="h-4 w-4 text-orange-500" /> Etiquetas / Zonas
                (Separadas por coma)
              </Label>
              <Input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Ej: VIP, Parque Central, Moroso..."
                className="h-11 border-slate-200 bg-white"
              />
              <p className="text-xs text-slate-400 font-medium">
                Ayuda a filtrar reportes y agrupar rutas de entrega.
              </p>
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: UBICACIONES / SEDES */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-base font-black tracking-widest text-slate-800 uppercase flex items-center gap-2">
              <MapPin className="h-5 w-5 text-orange-500" /> 2. Direcciones de
              Entrega
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                appendLocation({
                  name: "",
                  address: "",
                  reference: "",
                  contactName: "",
                  contactPhone: "",
                  isMain: false,
                })
              }
              className="font-bold text-orange-700 border-orange-200 hover:bg-orange-50 rounded-lg shadow-sm"
            >
              <Plus className="mr-1 h-4 w-4" /> Añadir Sede
            </Button>
          </div>

          <div className="space-y-6">
            {locationFields.map((field, index) => (
              <div
                key={field.id}
                className="relative bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
              >
                {index === 0 && (
                  <div className="absolute -top-3 -left-2 bg-blue-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Sede Principal
                  </div>
                )}

                {index > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLocation(index)}
                    className="absolute top-4 right-4 text-red-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 rounded-full"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500">
                      Nombre del Local / Sede
                    </Label>
                    <Input
                      {...form.register(`locations.${index}.name` as const)}
                      placeholder="Ej: Almacén Norte"
                      className="h-10 border-slate-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500">
                      Dirección Exacta *
                    </Label>
                    <Input
                      {...form.register(`locations.${index}.address` as const)}
                      placeholder="Av. Principal 123..."
                      className="h-10 border-slate-200"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs font-bold text-slate-500">
                      Referencia (Para el chofer)
                    </Label>
                    <Input
                      {...form.register(
                        `locations.${index}.reference` as const,
                      )}
                      placeholder="Frente al parque, portón verde..."
                      className="h-10 border-slate-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                      <User className="h-3 w-3" /> Encargado de Local (Opc.)
                    </Label>
                    <Input
                      {...form.register(
                        `locations.${index}.contactName` as const,
                      )}
                      placeholder="Nombre de quien recibe"
                      className="h-10 border-slate-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                      <Phone className="h-3 w-3" /> Teléfono del Local
                    </Label>
                    <Input
                      {...form.register(
                        `locations.${index}.contactPhone` as const,
                      )}
                      placeholder="Celular o fijo de la sede"
                      className="h-10 border-slate-200"
                    />
                  </div>
                </div>

                {/* NUEVO: SECCIÓN DE MAPA Y COORDENADAS MANUALES */}
                <div className="space-y-4 md:col-span-2 mt-6 pt-5 border-t border-slate-100 bg-slate-50/50 -mx-6 px-6 pb-4 rounded-b-2xl">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <MapIcon className="h-4 w-4 text-blue-500" /> Ubicación
                      GPS
                    </Label>
                    {form.watch(`locations.${index}.coordinates.lat`) ? (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
                        <CheckCircle2 className="h-3 w-3 inline mr-1" />{" "}
                        Coordenadas Activas
                      </span>
                    ) : null}
                  </div>

                  <MapPicker
                    value={form.watch(`locations.${index}.coordinates`) as any}
                    onChange={(coords) => {
                      form.setValue(`locations.${index}.coordinates`, coords, {
                        shouldValidate: true,
                      });
                    }}
                  />
                  <p className="text-[10px] text-slate-400 font-medium italic">
                    Pega las coordenadas extraídas de Google Maps en el cajón
                    superior, o haz clic directamente en el mapa para marcar la
                    puerta.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            className="font-bold text-slate-500"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-slate-900 hover:bg-slate-800 text-white font-black px-10 shadow-lg shadow-slate-900/20 rounded-xl"
          >
            {isPending ? (
              "Guardando..."
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" /> Guardar Cliente
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
