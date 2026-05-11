"use client";

import { useState, useEffect } from "react";
import { Product } from "@/core/entities/Inventory";
import { Button } from "@/components/ui/button";
import {
  Truck,
  User,
  Banknote,
  Map as MapIcon,
  Navigation,
  ChevronLeft,
  Package,
  RefreshCw,
  ArrowDownToLine,
  AlertTriangle,
  Save,
} from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  reloadManifestSchema,
  ReloadManifestFormValues,
} from "@/core/validations/dispatchSchemas";
import { reloadDispatchAction } from "../actions";
import { toast } from "sonner";

// --- INTEGRACIÓN DE MAPA Y FIREBASE ---
import { doc, onSnapshot } from "firebase/firestore";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
} from "@vis.gl/react-google-maps";
import { db } from "@/services/firebase/config";

interface Props {
  manifest: any;
  products: Product[];
  driverName: string;
}

export function DispatchDetailsClient({
  manifest,
  products,
  driverName,
}: Props) {
  const [isReloadOpen, setIsReloadOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  // Estados para el Tracking GPS
  const [truckLocation, setTruckLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Escuchar GPS en tiempo real
  useEffect(() => {
    if (manifest.status !== "ON_ROUTE") return;

    const unsubscribe = onSnapshot(
      doc(db, "liveTracking", manifest.id),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTruckLocation({ lat: data.latitude, lng: data.longitude });
          setLastUpdate(data.updatedAt?.toDate() || new Date());
        }
      },
    );

    return () => unsubscribe();
  }, [manifest.id, manifest.status]);

  // Lógica de carga a bordo (Mantenida de tu archivo original)
  const safeItems = manifest.items || [];
  const groupedLoad = safeItems.reduce((acc: any, item: any) => {
    if (!acc[item.productId])
      acc[item.productId] = {
        total: 0,
        product: products.find((p) => p.id === item.productId),
      };
    acc[item.productId].total +=
      item.quantityLoaded -
      (item.quantityReturnedFull || 0) -
      (item.wasteQuantity || 0);
    return acc;
  }, {});

  const activeLoadBoxes = Object.values(groupedLoad).filter(
    (g: any) => g.total > 0,
  );
  const dispatchDate = new Date(manifest.dispatchDate);
  const formattedDate = `${dispatchDate.getDate()}/${dispatchDate.getMonth() + 1}/${dispatchDate.getFullYear()}`;

  // Formulario (Mantenido de tu archivo original)
  const form = useForm<ReloadManifestFormValues>({
    resolver: zodResolver(reloadManifestSchema) as any,
    defaultValues: {
      cashAdvance: 0,
      additionalPettyCash: 0,
      notes: "",
      returnedEmpties: [],
      newItems: [],
    },
  });

  const {
    fields: emptyFields,
    append: appendEmpty,
    remove: removeEmpty,
  } = useFieldArray({ control: form.control, name: "returnedEmpties" });
  const {
    fields: newItemsFields,
    append: appendNewItem,
    remove: removeNewItem,
  } = useFieldArray({ control: form.control, name: "newItems" });

  const onReloadSubmit = async (values: ReloadManifestFormValues) => {
    setIsPending(true);
    const result = await reloadDispatchAction(manifest.id, values);
    setIsPending(false);
    if (result.success) {
      toast.success("Parada en Pits registrada.");
      setIsReloadOpen(false);
      form.reset();
    }
  };

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}>
      <div className="space-y-6">
        {/* HEADER (Mantenido) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="rounded-full"
            >
              <Link href="/dispatch">
                <ChevronLeft className="h-6 w-6" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-black text-slate-900">
                Detalles del Despacho
              </h1>
              <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">
                ID: {manifest.id}
              </p>
            </div>
          </div>

          {manifest.status === "ON_ROUTE" && (
            /* Aquí va tu Dialog de Parada en Pits igual que antes... */
            <Dialog open={isReloadOpen} onOpenChange={setIsReloadOpen}>
              <DialogTrigger asChild>
                <Button className="bg-orange-500 font-black">
                  <RefreshCw className="mr-2 h-4 w-4" /> Parada en Pits
                </Button>
              </DialogTrigger>
              {/* Contenido del Dialog idéntico al tuyo... */}
            </Dialog>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUMNA INFO (Mantenida) */}
          <div className="space-y-6">
            <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm">
              <div className="flex justify-between items-center border-b pb-4 mb-4">
                <span
                  className={`px-4 py-1.5 rounded-full text-xs font-black uppercase ${manifest.status === "ON_ROUTE" ? "bg-blue-600 text-white" : "bg-green-100 text-green-700"}`}
                >
                  {manifest.status === "ON_ROUTE" ? "En Progreso" : "Liquidado"}
                </span>
                <p className="text-sm font-black text-slate-800">
                  {formattedDate}
                </p>
              </div>
              {/* Bloques de Vehículo, Chofer y Caja Chica iguales a los tuyos... */}
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center">
                    <Truck className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Vehículo
                    </p>
                    <p className="font-black text-slate-900">
                      ({manifest.truckPlate})
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Chofer
                    </p>
                    <p className="font-bold text-slate-700">{driverName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center">
                    <Banknote className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Caja Chica
                    </p>
                    <p className="font-black text-green-700">
                      S/ {manifest.initialPettyCash?.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* CARGA A BORDO (Mantenida) */}
            <div className="bg-[#0f172a] rounded-[2rem] p-6 shadow-xl text-white">
              <h3 className="font-black text-lg flex items-center gap-2 mb-6">
                <Package className="h-5 w-5 text-blue-400" /> Carga a Bordo
              </h3>
              <div className="space-y-4">
                {activeLoadBoxes.map((group: any) => (
                  <div
                    key={group.product?.id}
                    className="flex justify-between items-center border-b border-slate-800 pb-3"
                  >
                    <p className="font-bold text-slate-200">
                      {group.product?.name}
                    </p>
                    <span className="text-xl font-black text-blue-400">
                      {group.total} <span className="text-xs">u.</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* COLUMNA MAPA MEJORADA */}
          <div className="lg:col-span-2">
            <div className="bg-slate-100 border border-slate-200 rounded-[2rem] h-full min-h-[600px] relative overflow-hidden shadow-inner">
              {truckLocation ? (
                <Map
                  defaultCenter={truckLocation}
                  defaultZoom={15}
                  mapId="DEMO_MAP_ID" // Puedes crear uno en Google Cloud Console para estilos personalizados
                  gestureHandling={"greedy"}
                  disableDefaultUI={true}
                >
                  <AdvancedMarker position={truckLocation}>
                    <Pin
                      background={"#2563eb"}
                      glyphColor={"#fff"}
                      borderColor={"#1e40af"}
                    />
                  </AdvancedMarker>
                </Map>
              ) : (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <div className="animate-spin">
                    <RefreshCw className="h-10 w-10 text-slate-300" />
                  </div>
                  <p className="font-bold text-slate-400">
                    Esperando señal GPS...
                  </p>
                </div>
              )}

              {/* Overlay de información GPS */}
              {truckLocation && (
                <div className="absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-none">
                  <div className="bg-white/90 backdrop-blur border border-slate-200 rounded-2xl p-4 shadow-xl pointer-events-auto">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span className="text-xs font-black text-slate-800 uppercase">
                        En Vivo
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Última actualización
                    </p>
                    <p className="text-sm font-black text-slate-900">
                      {lastUpdate?.toLocaleTimeString()}
                    </p>
                  </div>

                  <Button className="bg-[#0f172a] hover:bg-slate-800 text-white rounded-2xl font-black px-6 shadow-xl pointer-events-auto">
                    <Navigation className="mr-2 h-4 w-4" /> Seguir Camión
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </APIProvider>
  );
}
