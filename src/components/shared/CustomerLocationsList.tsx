// src/components/shared/CustomerLocationsList.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Plus, Camera } from "lucide-react";

interface CustomerLocationsListProps {
  customerId: string;
  locations: any[];
}

export function CustomerLocationsList({
  customerId,
  locations,
}: CustomerLocationsListProps) {
  return (
    <Card className="h-full shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-700" /> Ubicaciones de Entrega
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          onClick={() => {
            /* Aquí abrirás el formulario para el customerId */
          }}
        >
          <Plus className="h-4 w-4" /> Agregar GPS
        </Button>
      </CardHeader>
      <CardContent className="pt-6">
        {locations.length > 0 ? (
          <div className="space-y-4">
            {locations.map((loc, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 border rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                    <Camera className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{loc.alias}</h4>
                    <p className="text-xs text-gray-500">{loc.address}</p>
                    <p className="text-[10px] font-mono text-blue-600 mt-1">
                      Lat: {loc.latitude} | Lng: {loc.longitude}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-700 font-bold"
                >
                  Ver Mapa
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 border-2 border-dashed rounded-xl">
            <p className="text-sm text-gray-500">
              No hay ubicaciones registradas con GPS.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
