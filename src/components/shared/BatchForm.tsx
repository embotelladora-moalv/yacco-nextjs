// src/components/shared/BatchForm.tsx
"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { batchSchema, BatchFormValues } from "@/core/validations/batchSchema";
import { Product } from "@/core/entities/Product";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

interface BatchFormProps {
  onSubmitAction: (data: BatchFormValues) => Promise<void>;
  isLoading?: boolean;
  availableProducts: Product[]; // Necesitamos la lista de productos vivos
}

export function BatchForm({
  onSubmitAction,
  isLoading,
  availableProducts,
}: BatchFormProps) {
  const form = useForm<BatchFormValues>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      // Formato YYYY-MM-DD requerido por el input type="date"
      productionDate: new Date().toISOString().split("T")[0] as any,
      managerId: "encargado-1", // TODO: Obtener del usuario logueado en el futuro
      status: "draft",
      notes: "",
      // Iniciamos con una fila vacía por defecto
      details: [{ productId: "", quantityProduced: 0 }],
    },
  });

  // Magia de React Hook Form para arrays dinámicos
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "details",
  });

  const handleSubmit = async (values: BatchFormValues) => {
    await onSubmitAction(values);
    form.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        {/* --- DATOS GENERALES DEL LOTE --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="productionDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de Producción</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado del Lote</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione estado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="draft">
                      Borrador (No afecta stock)
                    </SelectItem>
                    <SelectItem value="completed">
                      Completado (Suma al Kardex)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="md:col-span-3">
                <FormLabel>Notas u Observaciones</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Ej. Lote de la mañana, turno 1..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* --- DETALLE DE PRODUCTOS PRODUCIDOS --- */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Productos Producidos</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ productId: "", quantityProduced: 0 })}
            >
              <Plus className="w-4 h-4 mr-2" /> Añadir Producto
            </Button>
          </div>

          {fields.map((field, index) => (
            <Card key={field.id}>
              <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end">
                {/* Selector de Producto */}
                <div className="flex-1 w-full">
                  <FormField
                    control={form.control}
                    name={`details.${index}.productId`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Producto</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione un producto" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableProducts.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} ({product.volumeCapacity}L)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Cantidad Producida */}
                <div className="w-full md:w-48">
                  <FormField
                    control={form.control}
                    name={`details.${index}.quantityProduced`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cantidad Llenada</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              field.onChange(isNaN(val) ? 0 : val);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Botón Eliminar Fila */}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="mb-0.5"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1} // No permitimos borrar si es la única fila
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
          {/* Mostramos el error general del array (ej. si borraron todos los productos) */}
          {form.formState.errors.details?.root && (
            <p className="text-sm text-destructive">
              {form.formState.errors.details.root.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full md:w-auto mt-6"
        >
          {isLoading ? "Procesando Lote..." : "Guardar Lote de Producción"}
        </Button>
      </form>
    </Form>
  );
}
