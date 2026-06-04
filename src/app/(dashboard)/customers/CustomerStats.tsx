import { Card, CardContent } from "@/components/ui/card";
import { Users, DollarSign, Droplet } from "lucide-react";

export function CustomerStats() {
  // En producción, esto viene de un documento agregado en Firestore para evitar lecturas masivas.
  const stats = { totalActive: 142, totalDebt: 4500.5, loanedBottles: 320 };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card className="border-blue-100 shadow-sm shadow-blue-900/5">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">
              Clientes Activos
            </p>
            <p className="text-2xl font-black text-gray-900">
              {stats.totalActive}
            </p>
          </div>
        </CardContent>
      </Card>
      <Card className="border-red-100 shadow-sm shadow-red-900/5">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">
              Cartera Pesada (Deuda)
            </p>
            <p className="text-2xl font-black text-gray-900">
              S/ {stats.totalDebt.toFixed(2)}
            </p>
          </div>
        </CardContent>
      </Card>
      <Card className="border-cyan-100 shadow-sm shadow-cyan-900/5">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="p-3 bg-cyan-50 text-cyan-600 rounded-xl">
            <Droplet className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">
              Bidones en Calle
            </p>
            <p className="text-2xl font-black text-gray-900">
              {stats.loanedBottles} Und.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
