"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Customer } from "@/core/entities/CRM";
import { Product } from "@/core/entities/Inventory"; //
import {
  Search,
  Filter,
  User,
  MapPin,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Edit,
  ExternalLink,
  Tag,
  AlertCircle,
  MoreHorizontal,
  Clock,
  Building2,
  Coins,
  ArrowRightLeft,
  ChevronDown,
  X,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

interface CustomerTableProps {
  initialCustomers: Customer[];
  products: Product[]; // 🔥 Conectamos el catálogo para saber los nombres de los bidones
}

export function CustomerTable({
  initialCustomers,
  products,
}: CustomerTableProps) {
  // --- ESTADOS DE TABLA ---
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredCustomersList, setFilteredCustomersList] =
    useState<Customer[]>(initialCustomers);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "INACTIVE"
  >("ALL");
  const [debtFilter, setDebtFilter] = useState<"ALL" | "WITH_DEBT" | "NO_DEBT">(
    "ALL",
  );
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // --- ESTADOS PARA MODALS INTERNOS DE CONFIGURACIÓN ---
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [modalType, setModalType] = useState<
    "NONE" | "ENVASES" | "DEUDA_INICIAL"
  >("NONE");
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);

  // Valores de los formularios de los Modals
  const [initialDebtValue, setInitialDebtValue] = useState<number>(0);
  const [containerAdjustments, setContainerAdjustments] = useState<
    Record<string, number>
  >({});

  // Cierra popup de filtros al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setShowFilters(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- LÓGICA DE FILTRADO Y MIGRACIÓN SEGURA ---
  const filteredCustomers = useMemo(() => {
    return initialCustomers.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.documentNumber.includes(searchQuery) ||
        c.alias?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.some((tag) => c.tags?.includes(tag));
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && c.isActive) ||
        (statusFilter === "INACTIVE" && !c.isActive);

      // 🔥 CORRECCIÓN: Number() para evitar fallos si Firebase guardó strings
      const hasMonetaryDebt = Number((c as any).monetaryDebt || 0) > 0;
      const hasContainerDebt =
        c.containerBalances?.some((b) => Number(b.balance || 0) > 0) || false;
      const hasAnyDebt = hasMonetaryDebt || hasContainerDebt;

      const matchesDebt =
        debtFilter === "ALL" ||
        (debtFilter === "WITH_DEBT" && hasAnyDebt) ||
        (debtFilter === "NO_DEBT" && !hasAnyDebt);

      return matchesSearch && matchesTags && matchesStatus && matchesDebt;
    });
  }, [initialCustomers, searchQuery, selectedTags, statusFilter, debtFilter]);

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedData = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );
  const allTags = Array.from(
    new Set(initialCustomers.flatMap((c) => c.tags || [])),
  );
  const activeFiltersCount =
    selectedTags.length +
    (statusFilter !== "ALL" ? 1 : 0) +
    (debtFilter !== "ALL" ? 1 : 0);

  // Render seguro contra errores de fechas corruptas de Firebase
  const renderLastSaleSafe = (dateStr: string | null | undefined) => {
    if (!dateStr)
      return (
        <span className="text-xs text-slate-400 italic font-medium">
          Sin compras aún
        </span>
      );
    try {
      const parsedDate = new Date(dateStr);
      if (isNaN(parsedDate.getTime()))
        return (
          <span className="text-xs text-slate-400 italic font-medium">
            Sin compras aún
          </span>
        );
      return (
        <div>
          <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs">
            <Clock className="h-3.5 w-3.5 text-blue-500" />
            {formatDistanceToNow(parsedDate, { addSuffix: true, locale: es })}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
            {format(parsedDate, "dd MMM yyyy", { locale: es })}
          </div>
        </div>
      );
    } catch {
      return (
        <span className="text-xs text-slate-400 italic font-medium">
          Sin compras aún
        </span>
      );
    }
  };

  // --- HANDLERS PARA PROCESAR LOS MODALS ACCIONES ---
  const handleOpenDeudaModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setInitialDebtValue((customer as any).monetaryDebt || 0);
    setModalType("DEUDA_INICIAL");
  };

  const handleOpenEnvasesModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    const initialBalances: Record<string, number> = {};
    products.forEach((p) => {
      const match = customer.containerBalances?.find(
        (b) => b.productId === p.id,
      );
      initialBalances[p.id] = match ? Number(match.balance) : 0;
    });
    setContainerAdjustments(initialBalances);
    setModalType("ENVASES");
  };

  const handleSaveInitialDebt = async () => {
    if (!selectedCustomer) return;
    setIsSubmittingModal(true);
    try {
      // Aquí invocarías tu server action real, ej: await saveInitialDebtAction(selectedCustomer.id, initialDebtValue)
      toast.success("Deuda inicial monetaria actualizada correctamente");
      setModalType("NONE");
    } catch {
      toast.error("Error al guardar la deuda");
    } finally {
      setIsSubmittingModal(false);
    }
  };

  const handleSaveContainers = async () => {
    if (!selectedCustomer) return;
    setIsSubmittingModal(true);
    try {
      // Aquí mapeas el objeto containerAdjustments y llamas a tu backend/repository
      toast.success("Inventario inicial de envases sincronizado con éxito");
      setModalType("NONE");
    } catch {
      toast.error("Error al procesar el ajuste");
    } finally {
      setIsSubmittingModal(false);
    }
  };

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm flex flex-col relative min-h-[500px]">
      {/* TOOLBAR */}
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between gap-4 items-center">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, alias o RUC/DNI..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
          />
        </div>

        <div className="relative" ref={filterRef}>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={`font-bold rounded-xl flex items-center gap-2 px-5 py-2.5 h-auto ${activeFiltersCount > 0 ? "border-blue-200 bg-blue-50 text-blue-700" : "text-slate-600"}`}
          >
            <Filter className="h-4 w-4" /> Filtros
            {activeFiltersCount > 0 && (
              <span className="h-4 w-4 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center ml-1">
                {activeFiltersCount}
              </span>
            )}
          </Button>

          {showFilters && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-20 space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-2">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1">
                  Estado
                </div>
                <div className="flex gap-2">
                  {["ALL", "ACTIVE", "INACTIVE"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-1 ${statusFilter === s ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
                    >
                      {s === "ALL"
                        ? "Todos"
                        : s === "ACTIVE"
                          ? "Activos"
                          : "Inactivos"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1">
                  Saldos Generales
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setDebtFilter("ALL")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${debtFilter === "ALL" ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600"}`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setDebtFilter("WITH_DEBT")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${debtFilter === "WITH_DEBT" ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-600"}`}
                  >
                    Con Deuda
                  </button>
                  <button
                    onClick={() => setDebtFilter("NO_DEBT")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${debtFilter === "NO_DEBT" ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-600"}`}
                  >
                    Sin Deuda
                  </button>
                </div>
              </div>

              {allTags.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1">
                    Zonas
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() =>
                          setSelectedTags((prev) =>
                            prev.includes(tag)
                              ? prev.filter((t) => t !== tag)
                              : [...prev, tag],
                          )
                        }
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${selectedTags.includes(tag) ? "bg-blue-100 text-blue-700 border border-blue-200" : "bg-slate-50 text-slate-600"}`}
                      >
                        <Tag className="inline mr-1 h-3 w-3" /> {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs font-bold text-slate-500 mt-2"
                onClick={() => {
                  setStatusFilter("ALL");
                  setDebtFilter("ALL");
                  setSelectedTags([]);
                }}
              >
                Limpiar todo
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* TABLA DE CLIENTES */}
      <div className="flex-1 overflow-x-auto">
        {paginatedData.length === 0 ? (
          <div className="p-16 text-center">
            <Building2 className="h-16 w-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-xl font-black text-slate-800">
              Sin resultados
            </h3>
            <p className="text-slate-500 font-medium mt-2">
              No se encontraron clientes con los criterios seleccionados.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-16 text-center">#</th>
                <th className="px-6 py-4">Cliente / Identificación</th>
                <th className="px-6 py-4">Ubicaciones</th>
                <th className="px-6 py-4 text-right">Deuda Pendiente (S/)</th>
                <th className="px-6 py-4 text-center">Deuda Envases</th>
                <th className="px-6 py-4">Última Venta</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.map((customer, index) => {
                const globalIndex =
                  (currentPage - 1) * itemsPerPage + index + 1;

                // 🔥 Aseguramos la lectura numérica de los balances contra strings corruptos
                const containerDebtFields =
                  customer.containerBalances?.filter(
                    (b) => Number(b.balance || 0) > 0,
                  ) || [];
                const totalContainersCount = containerDebtFields.reduce(
                  (sum, b) => sum + Number(b.balance || 0),
                  0,
                );
                const monetaryDebt = Number((customer as any).debtAmount || 0);

                return (
                  <tr
                    key={customer.id}
                    className="transition-colors hover:bg-slate-50/50 group"
                  >
                    <td className="px-6 py-4 text-center font-black text-slate-300">
                      {globalIndex}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/customers/${customer.id}`}
                              className="font-black text-slate-900 hover:text-blue-700 hover:underline transition-colors uppercase text-sm"
                            >
                              {customer.name}
                            </Link>
                            {!customer.isActive && (
                              <span className="bg-slate-100 text-slate-400 text-[9px] px-1.5 py-0.5 rounded uppercase font-black">
                                Inactivo
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-bold mt-0.5 flex gap-2">
                            <span>
                              {customer.documentType}: {customer.documentNumber}
                            </span>
                            {customer.alias && (
                              <span className="text-blue-600 font-black tracking-wide">
                                • {customer.alias}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-600 font-medium text-xs">
                        <MapPin className="h-3.5 w-3.5 text-orange-500" />
                        <span className="font-bold">
                          {customer.locations?.length || 0}
                        </span>{" "}
                        sedes
                      </div>
                    </td>

                    {/* Deuda en Soles */}
                    <td className="px-6 py-4 text-right">
                      {monetaryDebt > 0 ? (
                        <span className="bg-red-50 text-red-600 px-2.5 py-1 rounded-md text-xs font-black border border-red-100 inline-block">
                          S/ {monetaryDebt.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-bold text-xs italic">
                          Al día
                        </span>
                      )}
                    </td>

                    {/* 🔥 HOVER DE ENVASES INTERACTIVO (Tooltip CSS Puro sin dependencias) */}
                    <td className="px-6 py-4 text-center">
                      {totalContainersCount > 0 ? (
                        <div className="relative group/tooltip inline-block">
                          {/* Badge Principal */}
                          <span className="cursor-help bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md text-xs font-black border border-amber-200 flex items-center gap-1 mx-auto w-max">
                            <AlertCircle className="h-3.5 w-3.5" />{" "}
                            {totalContainersCount} u.
                          </span>

                          {/* Flotante descriptivo al hacer Hover */}
                          <div className="absolute hidden group-hover/tooltip:block z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white p-3 rounded-xl text-xs w-56 shadow-2xl border border-slate-800 text-left animate-in fade-in slide-in-from-bottom-1 duration-150">
                            <p className="font-black text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-800 pb-1.5 mb-1.5">
                              Desglose de Envases
                            </p>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {containerDebtFields.map((b) => {
                                const prodName =
                                  products.find((p) => p.id === b.productId)
                                    ?.name || "Envase Desconocido";
                                return (
                                  <div
                                    key={b.productId}
                                    className="flex justify-between gap-2 font-medium"
                                  >
                                    <span className="text-slate-300 truncate capitalize">
                                      {prodName}
                                    </span>
                                    <span className="font-mono font-bold text-amber-400 shrink-0">
                                      {b.balance} u.
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                          </div>
                        </div>
                      ) : (
                        <span className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-md text-[10px] font-black border border-emerald-100 flex items-center gap-1 justify-center w-max mx-auto">
                          <CheckCircle2 className="h-3 w-3" /> Sin Envases
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {renderLastSaleSafe(customer.lastSaleDate)}
                    </td>

                    {/* MENÚ DE ACCIONES */}
                    <td className="px-6 py-4 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0 hover:bg-slate-100 rounded-full"
                          >
                            <MoreHorizontal className="h-4 w-4 text-slate-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-56 rounded-2xl border-slate-100 shadow-xl p-2 space-y-0.5"
                        >
                          <DropdownMenuLabel className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-3 py-1.5">
                            Operaciones CRM
                          </DropdownMenuLabel>

                          <DropdownMenuItem
                            asChild
                            className="rounded-xl cursor-pointer hover:bg-slate-50 font-bold text-slate-600 text-xs"
                          >
                            <Link href={`/customers/${customer.id}`}>
                              <ExternalLink className="mr-2 h-4 w-4 text-blue-500" />{" "}
                              Ver Ficha y Guías
                            </Link>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            asChild
                            className="rounded-xl cursor-pointer hover:bg-slate-50 font-bold text-slate-600 text-xs"
                          >
                            <Link href={`/customers/${customer.id}/edit`}>
                              <Edit className="mr-2 h-4 w-4 text-orange-500" />{" "}
                              Editar Datos Básicos
                            </Link>
                          </DropdownMenuItem>

                          <DropdownMenuSeparator className="bg-slate-100" />
                          <DropdownMenuLabel className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-3 py-1.5">
                            Finanzas y Saldos
                          </DropdownMenuLabel>

                          {/* 🔥 CORREGIDO: Redirección exacta a collections/[id]/pay */}
                          <DropdownMenuItem
                            asChild
                            className="rounded-xl cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-700 font-black text-xs"
                          >
                            <Link href={`/collections/${customer.id}/pay`}>
                              <Coins className="mr-2 h-4 w-4 text-blue-600" />{" "}
                              Registrar Cobro / Pago
                            </Link>
                          </DropdownMenuItem>

                          {/* 🔥 CAMBIO: Modals Dinámicos disparados inline desde la propia tabla */}
                          <DropdownMenuItem
                            onClick={() => handleOpenEnvasesModal(customer)}
                            className="rounded-xl cursor-pointer hover:bg-slate-50 font-bold text-slate-600 text-xs"
                          >
                            <ArrowRightLeft className="mr-2 h-4 w-4 text-amber-500" />{" "}
                            Ajustar Envases (Migración)
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => handleOpenDeudaModal(customer)}
                            className="rounded-xl cursor-pointer hover:bg-slate-50 font-bold text-slate-600 text-xs"
                          >
                            <AlertCircle className="mr-2 h-4 w-4 text-slate-500" />{" "}
                            Configurar Deuda Inicial
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* FOOTER */}
      <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-4 mt-auto rounded-b-[2rem]">
        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
          <span>Mostrar</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border border-slate-200 bg-white rounded-md px-2 py-1 font-bold text-slate-700 focus:outline-none shadow-sm"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span>registros</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => prev - 1)}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0 bg-white shadow-sm"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center px-4 h-8 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-md shadow-sm">
            Página {currentPage} de {totalPages || 1}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => prev + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
            className="h-8 w-8 p-0 bg-white shadow-sm"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* =======================================================
          🔥 CAPA MODAL 1: AJUSTE / MIGRACIÓN DE ENVASES INICIALES
          ======================================================= */}
      {modalType === "ENVASES" && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <ArrowRightLeft className="h-5 w-5 text-amber-400" />
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wider">
                    Envases de Migración
                  </h3>
                  <p className="text-[11px] text-slate-300 font-medium">
                    Establecer stock en posesión de: {selectedCustomer.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalType("NONE")}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-slate-500 font-medium">
                Modifique los saldos de envases que este distribuidor o negocio
                ya tiene en su poder antes de iniciar operaciones en la
                plataforma:
              </p>
              {products
                .filter((p) => p.isReturnableContainer)
                .map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100"
                  >
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-slate-400" />
                      <span className="text-xs font-bold text-slate-700 capitalize">
                        {p.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 w-28">
                      <Input
                        type="number"
                        min="0"
                        value={containerAdjustments[p.id] || 0}
                        onChange={(e) =>
                          setContainerAdjustments((prev) => ({
                            ...prev,
                            [p.id]: Math.max(0, parseInt(e.target.value) || 0),
                          }))
                        }
                        className="h-9 text-center font-bold bg-white"
                      />
                      <span className="text-xs font-bold text-slate-400">
                        u.
                      </span>
                    </div>
                  </div>
                ))}
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="font-bold text-slate-500"
                onClick={() => setModalType("NONE")}
              >
                Cancelar
              </Button>
              <Button
                disabled={isSubmittingModal}
                size="sm"
                className="bg-slate-900 text-white font-black px-6"
                onClick={handleSaveContainers}
              >
                {isSubmittingModal ? "Guardando..." : "Sincronizar Saldos"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================
          🔥 CAPA MODAL 2: CONFIGURACIÓN DE DEUDA INICIAL MONETARIA
          ======================================================= */}
      {modalType === "DEUDA_INICIAL" && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <Coins className="h-5 w-5 text-blue-400" />
                <h3 className="font-black text-sm uppercase tracking-wider">
                  Deuda Inicial Monetaria
                </h3>
              </div>
              <button
                onClick={() => setModalType("NONE")}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  Monto Inicial Pendiente (S/)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                    S/
                  </span>
                  <Input
                    type="number"
                    step="0.10"
                    min="0"
                    value={initialDebtValue}
                    onChange={(e) =>
                      setInitialDebtValue(
                        Math.max(0, parseFloat(e.target.value) || 0),
                      )
                    }
                    className="h-11 pl-8 font-black text-base text-slate-800"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                Este monto se guardará en la cuenta corriente comercial del
                cliente como saldo deudor de apertura (migración histórica).
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="font-bold text-slate-500"
                onClick={() => setModalType("NONE")}
              >
                Cancelar
              </Button>
              <Button
                disabled={isSubmittingModal}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-black px-6 shadow-md"
                onClick={handleSaveInitialDebt}
              >
                {isSubmittingModal ? "Guardando..." : "Asignar Deuda"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
