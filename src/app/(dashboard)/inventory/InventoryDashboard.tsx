"use client";

import { Product } from "@/core/entities/Inventory";
import { Button } from "@/components/ui/button";
import {
  Package,
  Plus,
  ArrowDownToLine,
  Factory,
  AlertTriangle,
  Edit,
  MoreVertical,
  Trash2,
  History,
} from "lucide-react";
import Link from "next/link";
import { ProductionModal } from "./ProductionModal";
import { EmptyIntakeModal } from "./EmptyIntakeModal";
import { KardexSection } from "./KardexSection";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { toggleProductStatusAction } from "./actions";

interface InventoryDashboardProps {
  products: Product[];
}

export function InventoryDashboard({ products }: InventoryDashboardProps) {
  return (
    <div className="space-y-8">
      {/* HEADER Y BOTONES DE ACCIÓN */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <Factory className="h-8 w-8 text-blue-600" />
            Producción e Inventario
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Control de stock valorizado y trazabilidad de planta.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Modal para Ingresar Envases Nuevos (Compras) */}
          <EmptyIntakeModal products={products} />

          {/* Modal para Producción del Día */}
          <ProductionModal products={products} />

          {/* Botón para Crear Nuevo Producto en Catálogo */}
          <Button
            asChild
            className="bg-blue-700 hover:bg-blue-800 font-black shadow-lg shadow-blue-600/20"
          >
            <Link href="/inventory/new">
              <Plus className="mr-2 h-4 w-4" /> Nuevo Producto
            </Link>
          </Button>
        </div>
      </div>

      {/* SECCIÓN: TARJETAS DE STOCK DISPONIBLE */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
          <Package className="h-5 w-5 text-slate-400" /> Stock Actual en Planta
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-colors"
            >
              {/* Etiqueta de Producto y SKU */}
              {/* Etiqueta de Producto, Alerta y Menú */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-slate-900 leading-tight flex items-center gap-2">
                    {product.name}
                    {!product.isActive && (
                      <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Inactivo
                      </span>
                    )}
                  </h3>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider mt-0.5">
                    {product.sku}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {product.stockFilled <= 10 && product.isActive && (
                    <span title="Stock Bajo">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    </span>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors focus:outline-none">
                      <MoreVertical className="h-4 w-4 text-slate-400" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-48 font-medium"
                    >
                      {/* Ver Kardex (Baja a la tabla automáticamente) */}
                      <DropdownMenuItem
                        onClick={() => {
                          const select = document.querySelector(
                            "select",
                          ) as HTMLSelectElement;
                          if (select) {
                            select.value = product.id;
                            select.dispatchEvent(
                              new Event("change", { bubbles: true }),
                            );
                            window.scrollTo({
                              top: document.body.scrollHeight,
                              behavior: "smooth",
                            });
                          }
                        }}
                        className="cursor-pointer"
                      >
                        <History className="mr-2 h-4 w-4 text-blue-600" /> Ver
                        en Kardex
                      </DropdownMenuItem>

                      {/* Editar (Lleva a la ruta de edición) */}
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link href={`/inventory/${product.id}/edit`}>
                          <Edit className="mr-2 h-4 w-4 text-slate-600" />{" "}
                          Editar Producto
                        </Link>
                      </DropdownMenuItem>

                      {/* Desactivar / Activar */}
                      <DropdownMenuItem
                        className={`cursor-pointer ${product.isActive ? "text-red-600 focus:text-red-600 focus:bg-red-50" : "text-green-600 focus:text-green-600 focus:bg-green-50"}`}
                        onClick={async () => {
                          const res = await toggleProductStatusAction(
                            product.id,
                            !product.isActive,
                          );
                          if (res.success)
                            toast.success(
                              product.isActive
                                ? "Producto desactivado"
                                : "Producto reactivado",
                            );
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {product.isActive
                          ? "Desactivar (Ocultar)"
                          : "Reactivar"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Números Principales (Stock Lleno) */}
              <div className="mb-4">
                <p
                  className={`text-4xl font-black tracking-tighter ${product.stockFilled < 0 ? "text-red-500" : "text-slate-900"}`}
                >
                  {product.stockFilled}
                </p>
                <p className="text-xs font-bold text-slate-500 uppercase">
                  Unidades Listas (Llenas)
                </p>
              </div>

              {/* Detalle Financiero y Stock Vacío (Bifásico) */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">
                    Valor Ref. (Full):
                  </span>
                  <span className="font-bold text-green-700">
                    S/ {product.priceFull?.toFixed(2)}
                  </span>
                </div>

                {product.isReturnableContainer && (
                  <div className="flex justify-between items-center text-sm border-t border-slate-200 pt-2">
                    <span className="text-slate-500 font-medium">
                      Envases Vacíos:
                    </span>
                    <span className="font-black text-blue-700">
                      {product.stockEmpty} u.
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {products.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
              <Package className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 font-bold">
                No hay productos en el catálogo.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN KARDEX */}
      <div className="pt-8">
        <KardexSection products={products} />
      </div>
    </div>
  );
}
