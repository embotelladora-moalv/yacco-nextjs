import { productRepository } from "@/services/repositories/productRepository";
import { productionRepository } from "@/services/repositories/productionRepository";
import { ProductionTable } from "./ProductionTable";
import { ProductionChart } from "./ProductionChart";
import { Button } from "@/components/ui/button";
import { Plus, Package } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default async function ProductionPage() {
  const [products, recentBatches] = await Promise.all([
    productRepository.getAll(),
    productionRepository.getRecentBatches(200), // Traemos más registros para que funcione bien la paginación local
  ]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* CABECERA (Se mantiene igual) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900">
            Control de Producción
          </h1>
          <p className="text-sm text-gray-500 font-medium">
            Gestión de lotes y stock en tiempo real
          </p>
        </div>
        <Link href="/production/new">
          <Button className="bg-blue-700">
            <Plus className="mr-2 h-5 w-5" /> Registrar Lote
          </Button>
        </Link>
      </div>

      {/* GRID PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Tarjetas de Stock y Gráfico */}
        <div className="lg:col-span-1 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
            {products.slice(0, 3).map((product) => (
              <Card key={product.id} className="border-gray-100 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                      <Package className="h-4 w-4" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm truncate">
                      {product.name}
                    </h3>
                  </div>
                  <div className="flex justify-between border-t pt-3">
                    <div>
                      <p className="text-xl font-black text-blue-700">
                        {product.stockFilled}
                      </p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">
                        Llenos
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-500">
                        {product.stockEmpty}
                      </p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">
                        Vacíos
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Gráfico Semanal */}
          <div className="h-[320px]">
            <ProductionChart data={recentBatches} />
          </div>
        </div>

        {/* Columna Derecha: Tabla Completa */}
        <div className="lg:col-span-2">
          <ProductionTable initialData={recentBatches} products={products} />
        </div>
      </div>
    </div>
  );
}
