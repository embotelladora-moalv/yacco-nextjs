"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  customerSchema,
  CustomerFormValues,
} from "@/core/validations/customerSchema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { saveCustomerAction, updateCustomerAction } from "../actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Save,
  UserPlus,
  MapPin,
  PhoneCall,
  Tag,
  Plus,
  Trash2,
  X,
} from "lucide-react";

interface CustomerFormProps {
  initialData?: any;
}

export function CustomerForm({ initialData }: CustomerFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const router = useRouter();

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema) as any,
    defaultValues: (initialData || {
      type: "INDIVIDUAL",
      documentId: "",
      name: "",
      email: "",
      phone: "",
      tags: [],
      locations: [
        {
          id: crypto.randomUUID(),
          name: "Sede Principal",
          address: "",
          reference: "",
          isDefault: true,
        },
      ],
      contacts: [],
      customPrices: {},
    }) as CustomerFormValues,
  });

  // Manejadores dinámicos para Ubicaciones y Contactos
  const {
    fields: locationFields,
    append: appendLocation,
    remove: removeLocation,
  } = useFieldArray({
    control: form.control,
    name: "locations",
  });

  const {
    fields: contactFields,
    append: appendContact,
    remove: removeContact,
  } = useFieldArray({
    control: form.control,
    name: "contacts",
  });

  // Lógica para Etiquetas (Tags)
  const currentTags = form.watch("tags") || [];

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const newTag = tagInput.trim().toUpperCase();
      if (newTag && !currentTags.includes(newTag)) {
        form.setValue("tags", [...currentTags, newTag]);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    form.setValue(
      "tags",
      currentTags.filter((tag) => tag !== tagToRemove),
    );
  };

  // Guardar datos
  const onSubmit = async (values: CustomerFormValues) => {
    setIsLoading(true);
    const result = initialData
      ? await updateCustomerAction(initialData.id, values)
      : await saveCustomerAction(values);

    setIsLoading(false);

    if (result.success) {
      toast.success(
        initialData ? "Cliente actualizado" : "Cliente registrado en cartera",
      );
      router.push("/customers");
      router.refresh();
    } else {
      toast.error("Error", { description: result.error });
    }
  };

  // Observar el tipo de cliente para adaptar los textos
  const isCompany = form.watch("type") === "COMPANY";

  return (
    <div className="bg-white rounded-3xl border shadow-sm overflow-hidden max-w-4xl mx-auto mb-10">
      <div className="bg-blue-700 p-6 text-white flex items-center gap-3">
        <UserPlus className="h-6 w-6" />
        <div>
          <h2 className="text-xl font-black">
            {initialData
              ? "Editar Perfil del Cliente"
              : "Nuevo Registro de Cliente"}
          </h2>
          <p className="text-blue-100 text-sm">
            CRM y Gestión de Cartera Moalv S.a.C.
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-10">
        {/* SECCIÓN 1: DATOS PRINCIPALES */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 border-b pb-2">
            <UserPlus className="h-5 w-5 text-slate-400" />
            <h3 className="font-bold text-slate-800 text-lg">
              Datos Generales
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="font-bold text-slate-700">
                Tipo de Cliente
              </Label>
              <select
                {...form.register("type")}
                className="w-full h-11 px-3 rounded-md border border-slate-200 bg-white focus:ring-2 focus:ring-blue-600 outline-none font-medium"
              >
                <option value="INDIVIDUAL">Persona Natural (DNI)</option>
                <option value="COMPANY">Empresa (RUC)</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-slate-700">
                {isCompany ? "RUC" : "DNI"}
              </Label>
              <Input
                {...form.register("documentId")}
                className="h-11 focus-visible:ring-blue-600 font-mono"
                placeholder={isCompany ? "20000000001" : "70000001"}
              />
              {form.formState.errors.documentId && (
                <p className="text-xs text-red-500 font-bold">
                  {form.formState.errors.documentId.message}
                </p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="font-bold text-slate-700">
                {isCompany ? "Razón Social" : "Nombres y Apellidos"}
              </Label>
              <Input
                {...form.register("name")}
                className="h-11 focus-visible:ring-blue-600 text-lg font-bold"
              />
              {form.formState.errors.name && (
                <p className="text-xs text-red-500 font-bold">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-slate-700">
                Teléfono Principal
              </Label>
              <Input
                {...form.register("phone")}
                className="h-11 focus-visible:ring-blue-600"
              />
              {form.formState.errors.phone && (
                <p className="text-xs text-red-500 font-bold">
                  {form.formState.errors.phone.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-slate-700">
                Correo Electrónico (Opcional)
              </Label>
              <Input
                type="email"
                {...form.register("email")}
                className="h-11 focus-visible:ring-blue-600"
              />
            </div>
          </div>
        </section>

        {/* SECCIÓN 2: ETIQUETAS Y CATEGORÍAS */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 border-b pb-2">
            <Tag className="h-5 w-5 text-slate-400" />
            <h3 className="font-bold text-slate-800 text-lg">
              Categorización (Zonas, Rutas, Tipos)
            </h3>
          </div>

          <div className="space-y-3 p-5 bg-slate-50 rounded-xl border border-slate-100">
            <Label className="font-bold text-slate-700 text-sm">
              Agregar Etiquetas (Presiona Enter para guardar)
            </Label>
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="Ej: PARQUE, VIP, MERCADO NORTE..."
              className="h-11 border-slate-200 bg-white"
            />
            <div className="flex flex-wrap gap-2 pt-2">
              {currentTags.map((tag) => (
                <Badge
                  key={tag}
                  className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1 text-xs flex items-center gap-1 border-none shadow-sm"
                >
                  {tag}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-red-600"
                    onClick={() => handleRemoveTag(tag)}
                  />
                </Badge>
              ))}
              {currentTags.length === 0 && (
                <span className="text-xs text-slate-400 italic">
                  No hay etiquetas asignadas.
                </span>
              )}
            </div>
          </div>
        </section>

        {/* SECCIÓN 3: UBICACIONES (MÚLTIPLES DIRECCIONES) */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-slate-400" />
              <h3 className="font-bold text-slate-800 text-lg">
                Direcciones de Despacho
              </h3>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                appendLocation({
                  id: crypto.randomUUID(),
                  name: "Nueva Sede",
                  address: "",
                  reference: "",
                  isDefault: false,
                })
              }
              className="gap-2 text-blue-700"
            >
              <Plus className="h-4 w-4" /> Agregar Dirección
            </Button>
          </div>

          <div className="space-y-4">
            {locationFields.map((field, index) => (
              <div
                key={field.id}
                className="p-5 rounded-xl border border-slate-200 bg-white relative group shadow-sm"
              >
                {index > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLocation(index)}
                    className="absolute top-2 right-2 text-slate-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold text-xs text-slate-500 uppercase">
                      Nombre de Ubicación
                    </Label>
                    <Input
                      {...form.register(`locations.${index}.name`)}
                      placeholder="Ej: Local Sur, Casa Principal..."
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-xs text-slate-500 uppercase">
                      Dirección Exacta
                    </Label>
                    <Input
                      {...form.register(`locations.${index}.address`)}
                      placeholder="Av. Principal 123..."
                      className="h-10"
                    />
                    {form.formState.errors.locations?.[index]?.address && (
                      <p className="text-[10px] text-red-500 font-bold">
                        {
                          form.formState.errors.locations[index]?.address
                            ?.message
                        }
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-bold text-xs text-slate-500 uppercase">
                        Nombre de Ubicación
                      </Label>
                      <Input
                        {...form.register(`locations.${index}.name`)}
                        placeholder="Ej: Local Sur, Casa Principal..."
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-xs text-slate-500 uppercase">
                        Dirección Exacta
                      </Label>
                      <Input
                        {...form.register(`locations.${index}.address`)}
                        placeholder="Av. Principal 123..."
                        className="h-10"
                      />
                      {form.formState.errors.locations?.[index]?.address && (
                        <p className="text-[10px] text-red-500 font-bold">
                          {
                            form.formState.errors.locations[index]?.address
                              ?.message
                          }
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label className="font-bold text-xs text-slate-500 uppercase">
                        Referencias adicionales (Color de casa, entre calles)
                      </Label>
                      <Input
                        {...form.register(`locations.${index}.reference`)}
                        placeholder="Casa verde frente al parque..."
                        className="h-10"
                      />
                    </div>

                    {/* ---> INICIO DE LOS NUEVOS CAMPOS DE COORDENADAS <--- */}
                    <div className="space-y-2">
                      <Label className="font-bold text-xs text-slate-500 uppercase">
                        Latitud (Opcional)
                      </Label>
                      <Input
                        type="number"
                        step="any"
                        placeholder="Ej: -12.046374"
                        className="h-10 font-mono text-sm"
                        {...form.register(`locations.${index}.latitude`, {
                          setValueAs: (v) =>
                            v === "" || isNaN(parseFloat(v))
                              ? undefined
                              : parseFloat(v),
                        })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="font-bold text-xs text-slate-500 uppercase">
                        Longitud (Opcional)
                      </Label>
                      <Input
                        type="number"
                        step="any"
                        placeholder="Ej: -77.042793"
                        className="h-10 font-mono text-sm"
                        {...form.register(`locations.${index}.longitude`, {
                          setValueAs: (v) =>
                            v === "" || isNaN(parseFloat(v))
                              ? undefined
                              : parseFloat(v),
                        })}
                      />
                    </div>
                    {/* ---> FIN DE LOS NUEVOS CAMPOS <--- */}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECCIÓN 4: CONTACTOS ADICIONALES */}
        {isCompany && (
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <PhoneCall className="h-5 w-5 text-slate-400" />
                <h3 className="font-bold text-slate-800 text-lg">
                  Contactos de la Empresa
                </h3>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  appendContact({
                    id: crypto.randomUUID(),
                    name: "",
                    phone: "",
                    role: "",
                  })
                }
                className="gap-2 text-slate-600"
              >
                <Plus className="h-4 w-4" /> Agregar Contacto
              </Button>
            </div>

            <div className="space-y-4">
              {contactFields.length === 0 && (
                <p className="text-sm text-slate-400 italic">
                  No hay contactos adicionales registrados.
                </p>
              )}

              {contactFields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex flex-col md:flex-row gap-3 items-start md:items-end"
                >
                  <div className="flex-1 space-y-2 w-full">
                    <Label className="font-bold text-xs text-slate-500 uppercase">
                      Nombre de Contacto
                    </Label>
                    <Input
                      {...form.register(`contacts.${index}.name`)}
                      className="h-10"
                    />
                  </div>
                  <div className="flex-1 space-y-2 w-full">
                    <Label className="font-bold text-xs text-slate-500 uppercase">
                      Teléfono
                    </Label>
                    <Input
                      {...form.register(`contacts.${index}.phone`)}
                      className="h-10"
                    />
                  </div>
                  <div className="flex-1 space-y-2 w-full">
                    <Label className="font-bold text-xs text-slate-500 uppercase">
                      Cargo / Área
                    </Label>
                    <Input
                      {...form.register(`contacts.${index}.role`)}
                      placeholder="Ej: Administrador, Guardián"
                      className="h-10"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeContact(index)}
                    className="h-10 w-10 text-slate-400 hover:text-red-600 mb-0.5 shrink-0"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-14 bg-blue-700 hover:bg-blue-800 text-lg font-bold shadow-lg shadow-blue-900/20 mt-8"
        >
          <Save className="mr-2 h-6 w-6" />{" "}
          {initialData ? "Guardar Cambios" : "Registrar Cliente y Crear Perfil"}
        </Button>
      </form>
    </div>
  );
}
