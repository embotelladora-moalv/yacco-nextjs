// src/components/shared/ProductForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  productSchema,
  ProductFormValues,
} from "@/core/validations/productSchema";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface ProductFormProps {
  initialData?: Partial<ProductFormValues>;
  onSubmitAction: (data: ProductFormValues) => Promise<void>;
  isLoading?: boolean;
}

export function ProductForm({
  initialData,
  onSubmitAction,
  isLoading,
}: ProductFormProps) {
  // 1. Inicializamos el formulario conectándolo con Zod
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initialData?.name || "",
      volumeCapacity: initialData?.volumeCapacity || 0,
      packagingType: initialData?.packagingType || undefined,
      hasTap: initialData?.hasTap || false,
      isMaquila: initialData?.isMaquila || false,
    },
  });

  // 2. Manejador de envío seguro
  const handleSubmit = async (values: ProductFormValues) => {
    await onSubmitAction(values);
    if (!initialData) {
      form.reset(); // Limpiamos si es modo creación
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6 max-w-2xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nombre del Producto */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del Producto</FormLabel>
                <FormControl>
                  <Input placeholder="Ej. Bidón 20L Premium" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Capacidad (Volumen) */}
          <FormField
            control={form.control}
            name="volumeCapacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Capacidad (Litros)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="20"
                    {...field}
                    // Interceptamos el evento para forzar el tipo Number
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      // Si está vacío o no es un número, enviamos 0, de lo contrario enviamos el número real
                      field.onChange(isNaN(value) ? 0 : value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Tipo de Envase */}
        <FormField
          control={form.control}
          name="packagingType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Envase</FormLabel>
              {/* LA MAGIA AQUÍ: Usamos value, NUNCA defaultValue, y forzamos un string */}
              <Select onValueChange={field.onChange} value={field.value || ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione el tipo de envase" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="bottle">Botella</SelectItem>
                  <SelectItem value="box">Caja</SelectItem>
                  <SelectItem value="non_discardable">
                    Bidón no descartable
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col md:flex-row gap-6 border p-4 rounded-md">
          {/* ¿Tiene caño? */}
          <FormField
            control={form.control}
            name="hasTap"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Tiene Caño</FormLabel>
                  <FormDescription>
                    Marcar si el bidón incluye caño dispensador.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          {/* ¿Es Maquila? */}
          <FormField
            control={form.control}
            name="isMaquila"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Es Maquila</FormLabel>
                  <FormDescription>
                    Marcar si este producto se produce para terceros.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
          {isLoading
            ? "Guardando..."
            : initialData
              ? "Actualizar Producto"
              : "Registrar Producto"}
        </Button>
      </form>
    </Form>
  );
}
