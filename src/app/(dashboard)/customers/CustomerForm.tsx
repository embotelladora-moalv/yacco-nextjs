"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import imageCompression from "browser-image-compression";
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
  Image as ImageIcon,
  Loader2,
  Search,
  ShieldCheck,
  Banknote,
  Receipt, // <-- Icono para la sección de precios
} from "lucide-react";
import dynamic from "next/dynamic";
import { Product } from "@/core/entities/Inventory"; // Asegúrate de que apunte a tu entidad real

interface CustomerFormProps {
  initialData?: any;
  products: Product[]; // 🔥 NUEVA PROP: Lista de productos disponibles para asignar precios especiales
}

const MapPicker = dynamic(() => import("./MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-[250px] w-full bg-slate-100 animate-pulse rounded-xl flex items-center justify-center text-slate-400 font-bold">
      Cargando mapa...
    </div>
  ),
});

export function CustomerForm({ initialData, products }: CustomerFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [compressingIndex, setCompressingIndex] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const router = useRouter();
  const [tagsInput, setTagsInput] = useState(
    initialData?.tags?.join(", ") || "",
  );

  const formattedInitialData = initialData
    ? {
        ...initialData,
        locations: (initialData.locations || []).map((loc: any) => ({
          ...loc,
          coordinates:
            loc.latitude !== undefined && loc.longitude !== undefined
              ? { lat: Number(loc.latitude), lng: Number(loc.longitude) }
              : undefined,
        })),
      }
    : undefined;

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema) as any,
    defaultValues: formattedInitialData || {
      name: "",
      alias: "",
      documentType: "DNI",
      documentNumber: "",
      contactName: "",
      contactPhone: "",
      tags: [],
      customPrices: [], // Inicializamos el array de precios especiales
      locations: [
        {
          name: "Sede Principal",
          address: "",
          reference: "",
          contactName: "",
          contactPhone: "",
          ubigeo: "",
          imageUrl: "",
          isMain: true,
        },
      ],
    },
  });

  // Arreglo dinámico para las Sedes/Ubicaciones
  const {
    fields: locationFields,
    append: appendLocation,
    remove: removeLocation,
  } = useFieldArray({
    control: form.control,
    name: "locations",
  });

  // 🔥 NUEVO: Arreglo dinámico para la lista de precios personalizados
  const {
    fields: priceFields,
    append: appendPrice,
    remove: removePrice,
  } = useFieldArray({
    control: form.control,
    name: "customPrices",
  });

  // --- LÓGICA DE BÚSQUEDA A LA API SUNAT/RENIEC ---
  const handleSearchDocument = async () => {
    const documentNumber = form.getValues("documentNumber");
    const documentType = form.getValues("documentType");

    if (
      !documentNumber ||
      (documentNumber.length !== 8 && documentNumber.length !== 11)
    ) {
      toast.error("El documento debe tener 8 (DNI) u 11 (RUC) dígitos.");
      return;
    }

    if (documentNumber.length === 11 && documentType !== "RUC") {
      form.setValue("documentType", "RUC");
    } else if (documentNumber.length === 8 && documentType !== "DNI") {
      form.setValue("documentType", "DNI");
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/consulta-doc?numero=${documentNumber}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "No se encontró el documento en SUNAT/RENIEC",
        );
      }

      if (documentNumber.length === 11) {
        form.setValue("name", data.razon_social || data.razonSocial, {
          shouldValidate: true,
        });

        if (data.direccion && !form.getValues("locations.0.address")) {
          form.setValue("locations.0.address", data.direccion, {
            shouldValidate: true,
          });
        }
        if (data.ubigeo && !form.getValues("locations.0.ubigeo")) {
          form.setValue("locations.0.ubigeo", data.ubigeo, {
            shouldValidate: true,
          });
        }
        toast.success("RUC encontrado");
      } else {
        const fullName =
          `${data.first_name || data.nombres} ${data.first_last_name || data.apellidoPaterno} ${data.second_last_name || data.apellidoMaterno}`.trim();
        form.setValue("name", fullName, { shouldValidate: true });
        toast.success("DNI encontrado");
      }
    } catch (error: any) {
      toast.error(error.message || "Error al consultar la API");
    } finally {
      setIsSearching(false);
    }
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    index: number,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setCompressingIndex(index);

      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      };

      const compressedFile = await imageCompression(file, options);

      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onloadend = () => {
        const base64data = reader.result as string;
        form.setValue(`locations.${index}.imageUrl` as any, base64data, {
          shouldDirty: true,
        });
        setCompressingIndex(null);
      };
    } catch (error) {
      console.error("Error comprimiendo:", error);
      toast.error("No se pudo procesar la imagen");
      setCompressingIndex(null);
    }
  };

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
      toast.success(initialData ? "Cliente actualizado" : "Cliente registrado");
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
            Cuentas corrientes, facturación, tarifas especiales y múltiples
            sedes de entrega.
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-10">
        {/* =======================================================
            SECCIÓN 1: DATOS GENERALES Y SUNAT
            ======================================================= */}
        <div className="space-y-4">
          <h3 className="text-base font-black tracking-widest text-slate-800 uppercase flex items-center gap-2 border-b border-slate-100 pb-2">
            <User className="h-5 w-5 text-blue-600" /> 1. Datos de Facturación /
            Generales
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <div className="md:col-span-2 bg-blue-50/50 p-5 rounded-2xl border border-blue-200/60 shadow-sm relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500"></div>

              <div className="flex items-center gap-2 mb-5">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                <h4 className="text-xs font-black text-blue-700 uppercase tracking-widest">
                  Validación SUNAT / RENIEC (Obligatorio)
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex gap-4">
                  <div className="space-y-2 w-1/3">
                    <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1">
                      <FileText className="h-3 w-3" /> Doc.
                    </Label>
                    <select
                      {...form.register("documentType")}
                      className="w-full h-11 px-3 rounded-md border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="DNI">DNI</option>
                      <option value="RUC">RUC</option>
                      <option value="OTHER">Otro</option>
                    </select>
                  </div>

                  <div className="space-y-2 flex-1">
                    <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                      Número *
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        {...form.register("documentNumber")}
                        placeholder="Ej: 20600000001"
                        maxLength={11}
                        className="h-11 border-slate-200 font-black flex-1 bg-white"
                      />
                      <Button
                        type="button"
                        variant="default"
                        disabled={isSearching}
                        onClick={handleSearchDocument}
                        className="h-11 px-4 font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shrink-0 shadow-sm"
                      >
                        {isSearching ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {form.formState.errors.documentNumber && (
                      <p className="text-xs text-red-500 font-bold">
                        {form.formState.errors.documentNumber.message as string}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                    Razón Social o Nombre Completo *
                  </Label>
                  <Input
                    {...form.register("name")}
                    placeholder="Se autocompleta con la búsqueda..."
                    className="h-11 border-slate-200 bg-white"
                  />
                  {form.formState.errors.name && (
                    <p className="text-xs text-red-500 font-bold">
                      {form.formState.errors.name.message as string}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2 bg-slate-100 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <Label className="font-black text-slate-800 text-sm flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-blue-600" /> Facturación
                      Automática Obligatoria
                    </Label>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Si está activo, el sistema exigirá comprobante electrónico
                      (Factura/Boleta) en cada pedido. Si está inactivo, las
                      ventas a este cliente se considerarán de control interno a
                      menos que se indique lo contrario.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      {...form.register("alwaysRequiresBilling")}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                Alias Comercial
              </Label>
              <Input
                {...form.register("alias")}
                placeholder="Ej: Bodega Doña María"
                className="h-11 border-slate-200 bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1">
                <Tag className="h-4 w-4 text-orange-500" /> Etiquetas / Zonas
              </Label>
              <Input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Ej: VIP, Parque Central..."
                className="h-11 border-slate-200 bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1">
                <User className="h-3 w-3 text-emerald-500" /> Contacto Principal
              </Label>
              <Input
                {...form.register("contactName")}
                placeholder="Dueño o gerente..."
                className="h-11 border-slate-200 bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1">
                <Phone className="h-3 w-3 text-emerald-500" /> Celular Principal
              </Label>
              <Input
                {...form.register("contactPhone")}
                placeholder="Nº celular"
                className="h-11 border-slate-200 bg-white font-medium"
              />
            </div>
          </div>
        </div>

        {/* =======================================================
            🔥 NUEVA SECCIÓN 3: PRECIOS Y TARIFAS ESPECIALES
            ======================================================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-base font-black tracking-widest text-slate-800 uppercase flex items-center gap-2">
              <Banknote className="h-5 w-5 text-emerald-600" /> 2. Tarifas
              Especiales de Distribución
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                appendPrice({
                  productId: "",
                  productName: "",
                  refillPrice: 0,
                  fullPrice: 0,
                  bottlePrice: 0,
                })
              }
              className="font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50"
            >
              <Plus className="mr-1 h-4 w-4" /> Asignar Precio Especial
            </Button>
          </div>

          {priceFields.length === 0 ? (
            <div className="text-center py-6 text-slate-400 font-medium text-xs bg-slate-50 border border-dashed rounded-2xl">
              Este cliente no tiene excepciones. Se le cobrarán los precios base
              públicos en todas las rutas.
            </div>
          ) : (
            <div className="space-y-4">
              {priceFields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 items-end relative pr-12"
                >
                  {/* Selector del Producto */}
                  <div className="md:col-span-3 space-y-2">
                    <Label className="text-xs font-bold text-slate-600">
                      Producto
                    </Label>
                    <select
                      {...form.register(
                        `customPrices.${index}.productId` as const,
                      )}
                      onChange={(e) => {
                        form
                          .register(`customPrices.${index}.productId`)
                          .onChange(e);
                        const selectedProd = products.find(
                          (p) => p.id === e.target.value,
                        );
                        if (selectedProd) {
                          form.setValue(
                            `customPrices.${index}.productName`,
                            selectedProd.name,
                          );
                        }
                      }}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs font-bold"
                    >
                      <option value="">Seleccione un producto...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Campo de Texto oculto para guardar el Nombre del Producto en Firebase */}
                  <input
                    type="hidden"
                    {...form.register(
                      `customPrices.${index}.productName` as const,
                    )}
                  />

                  {/* Input 1: Precio Recarga */}
                  <div className="md:col-span-3 space-y-2">
                    <Label className="text-xs font-bold text-blue-700">
                      1. Tarifa Recarga (Líquido)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                        S/
                      </span>
                      <Input
                        type="number"
                        step="0.10"
                        className="h-10 pl-8 font-bold text-right bg-white"
                        {...form.register(
                          `customPrices.${index}.refillPrice` as const,
                        )}
                      />
                    </div>
                  </div>

                  {/* Input 2: Precio Lleno Completo */}
                  <div className="md:col-span-3 space-y-2">
                    <Label className="text-xs font-bold text-emerald-700">
                      2. Tarifa Lleno Completo
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                        S/
                      </span>
                      <Input
                        type="number"
                        step="0.10"
                        className="h-10 pl-8 font-bold text-right bg-white"
                        {...form.register(
                          `customPrices.${index}.fullPrice` as const,
                        )}
                      />
                    </div>
                  </div>

                  {/* Input 3: Precio Solo Envase Plástico */}
                  <div className="md:col-span-3 space-y-2">
                    <Label className="text-xs font-bold text-amber-700">
                      3. Tarifa Solo Envase
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                        S/
                      </span>
                      <Input
                        type="number"
                        step="0.10"
                        className="h-10 pl-8 font-bold text-right bg-white"
                        {...form.register(
                          `customPrices.${index}.bottlePrice` as const,
                        )}
                      />
                    </div>
                  </div>

                  {/* Botón Eliminar Excepción */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removePrice(index)}
                    className="absolute top-1/2 -translate-y-1/2 right-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* =======================================================
            SECCIÓN 4: UBICACIONES / SEDES
            ======================================================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-base font-black tracking-widest text-slate-800 uppercase flex items-center gap-2">
              <MapPin className="h-5 w-5 text-orange-500" /> 3. Direcciones de
              Entrega (Para Guías)
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
                  ubigeo: "",
                  imageUrl: "",
                  isMain: false,
                })
              }
              className="font-bold text-orange-700 border-orange-200 hover:bg-orange-50"
            >
              <Plus className="mr-1 h-4 w-4" /> Añadir Sede
            </Button>
          </div>

          <div className="space-y-6">
            {locationFields.map((field, index) => {
              const currentImageUrl = form.watch(
                `locations.${index}.imageUrl` as any,
              );
              const isThisCompressing = compressingIndex === index;

              return (
                <div
                  key={field.id}
                  className="relative bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
                >
                  {index === 0 && (
                    <div className="absolute -top-3 -left-2 bg-blue-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Sede Principal
                    </div>
                  )}
                  {index > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLocation(index)}
                      className="absolute top-4 right-4 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full z-10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-2">
                    <div className="md:col-span-3 flex flex-col items-center justify-start space-y-2">
                      <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider text-center">
                        Foto Fachada
                      </Label>
                      <label
                        htmlFor={`image-upload-${index}`}
                        className="w-full aspect-square bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors relative group"
                      >
                        {isThisCompressing ? (
                          <div className="flex flex-col items-center text-blue-500">
                            <Loader2 className="h-6 w-6 animate-spin mb-2" />
                            <span className="text-[10px] font-bold">
                              Procesando...
                            </span>
                          </div>
                        ) : currentImageUrl ? (
                          <>
                            <img
                              src={currentImageUrl}
                              alt="Fachada"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-white text-[10px] font-bold uppercase tracking-wider">
                                Cambiar
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="text-slate-400 flex flex-col items-center">
                            <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
                            <span className="text-[10px] font-bold text-center px-4">
                              Añadir Foto
                            </span>
                          </div>
                        )}
                      </label>
                      <input
                        id={`image-upload-${index}`}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, index)}
                      />
                    </div>

                    <div className="md:col-span-9 grid grid-cols-1 md:grid-cols-12 gap-4">
                      <div className="space-y-2 md:col-span-8">
                        <Label className="text-xs font-bold text-slate-500">
                          Nombre de Sede
                        </Label>
                        <Input
                          {...form.register(`locations.${index}.name` as const)}
                          placeholder="Ej: Almacén Norte"
                          className="h-10 border-slate-200"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-4">
                        <Label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                          Ubigeo{" "}
                          <span className="text-[10px] text-red-500 font-black">
                            (SUNAT)
                          </span>
                        </Label>
                        <Input
                          {...form.register(
                            `locations.${index}.ubigeo` as const,
                          )}
                          placeholder="Ej: 250101"
                          maxLength={6}
                          className="h-10 border-slate-200 font-mono tracking-widest text-center"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-12">
                        <Label className="text-xs font-bold text-slate-500">
                          Dirección Exacta
                        </Label>
                        <Input
                          {...form.register(
                            `locations.${index}.address` as const,
                          )}
                          placeholder="Av. Principal 123..."
                          className="h-10 border-slate-200"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-12">
                        <Label className="text-xs font-bold text-slate-500">
                          Referencia visual
                        </Label>
                        <Input
                          {...form.register(
                            `locations.${index}.reference` as const,
                          )}
                          placeholder="Frente al parque..."
                          className="h-10 border-slate-200"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-6">
                        <Label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                          <User className="h-3 w-3" /> Encargado de Sede
                        </Label>
                        <Input
                          {...form.register(
                            `locations.${index}.contactName` as const,
                          )}
                          placeholder="Quien recibe"
                          className="h-10 border-slate-200"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-6">
                        <Label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                          <Phone className="h-3 w-3" /> Teléfono Sede
                        </Label>
                        <Input
                          {...form.register(
                            `locations.${index}.contactPhone` as const,
                          )}
                          placeholder="Celular"
                          className="h-10 border-slate-200"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 mt-6 pt-5 border-t border-slate-100 bg-slate-50/50 -mx-6 px-6 pb-4 rounded-b-2xl">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <MapIcon className="h-4 w-4 text-blue-500" /> Ubicación
                        GPS
                      </Label>
                    </div>
                    <MapPicker
                      value={
                        form.watch(`locations.${index}.coordinates`) as any
                      }
                      onChange={(coords) => {
                        form.setValue(
                          `locations.${index}.coordinates`,
                          coords,
                          { shouldValidate: true },
                        );
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* BOTONES DE ACCIÓN */}
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
            disabled={isPending || compressingIndex !== null}
            className="bg-slate-900 hover:bg-slate-800 text-white font-black px-10 shadow-lg shadow-slate-900/20 rounded-xl h-12"
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
