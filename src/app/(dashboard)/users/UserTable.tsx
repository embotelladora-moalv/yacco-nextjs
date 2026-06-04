"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Edit,
  ShieldCheck,
  Factory,
  BadgeDollarSign,
  Truck,
  User as UserIcon,
  MoreVertical,
  Users,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { User, UserRole } from "@/core/entities/User";
import { toggleUserStatusAction } from "./actions";
import Link from "next/link";
import { toast } from "sonner";

// Componente visual para los Roles
const RoleBadge = ({ role }: { role: string }) => {
  const configs: Record<string, any> = {
    ADMIN: {
      label: "Administrador",
      color: "bg-red-100 text-red-700",
      icon: <ShieldCheck className="h-3 w-3" />,
    },
    PRODUCTION: {
      label: "Producción",
      color: "bg-orange-100 text-orange-700",
      icon: <Factory className="h-3 w-3" />,
    },
    SALES: {
      label: "Ventas / Oficina",
      color: "bg-green-100 text-green-700",
      icon: <BadgeDollarSign className="h-3 w-3" />,
    },
    DRIVER: {
      label: "Chofer",
      color: "bg-blue-100 text-blue-700",
      icon: <Truck className="h-3 w-3" />,
    },
    ASSISTANT: {
      label: "Auxiliar",
      color: "bg-slate-100 text-slate-700",
      icon: <UserIcon className="h-3 w-3" />,
    },
  };
  const config = configs[role] || configs.ASSISTANT;
  return (
    <Badge
      className={`${config.color} border-none flex items-center gap-1 w-fit hover:${config.color}`}
    >
      {config.icon} {config.label}
    </Badge>
  );
};

export function UserTable({ initialData }: { initialData: User[] }) {
  const [data, setData] = useState<User[]>(initialData);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "INACTIVE"
  >("ALL");

  // Paginación
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Filtros dinámicos
  const filteredData = useMemo(() => {
    return data.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(query.toLowerCase()) ||
        user.email.toLowerCase().includes(query.toLowerCase());

      // CAMBIO AQUÍ: Usamos .includes() porque user.roles es un array
      const matchesRole =
        roleFilter === "ALL" || (user.roles && user.roles.includes(roleFilter));

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && user.isActive) ||
        (statusFilter === "INACTIVE" && !user.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [data, query, roleFilter, statusFilter]);

  // Lógica de paginación
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = filteredData.slice(
    page * rowsPerPage,
    (page + 1) * rowsPerPage,
  );

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const actionText = newStatus ? "activar" : "suspender";

    if (confirm(`¿Seguro que deseas ${actionText} a este usuario?`)) {
      const res = await toggleUserStatusAction(id, newStatus);
      if (res.success) {
        setData((prev) =>
          prev.map((u) => (u.id === id ? { ...u, isActive: newStatus } : u)),
        );
        toast.success(
          `Cuenta ${newStatus ? "activada" : "suspendida"} exitosamente`,
        );
      } else {
        toast.error("Error al actualizar el estado");
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* BARRA DE BÚSQUEDA Y FILTROS */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por nombre o correo..."
            className="pl-10 border-slate-200 focus-visible:ring-blue-600"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="gap-2 text-slate-600 border-slate-200 w-full md:w-auto font-bold"
              >
                <Filter className="h-4 w-4" /> Rol:{" "}
                {roleFilter === "ALL" ? "Todos" : roleFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setRoleFilter("ALL");
                  setPage(0);
                }}
              >
                Todos los Roles
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setRoleFilter("ADMIN");
                  setPage(0);
                }}
              >
                Administrador
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setRoleFilter("PRODUCTION");
                  setPage(0);
                }}
              >
                Producción
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setRoleFilter("SALES");
                  setPage(0);
                }}
              >
                Ventas
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setRoleFilter("DRIVER");
                  setPage(0);
                }}
              >
                Choferes
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="gap-2 text-slate-600 border-slate-200 w-full md:w-auto font-bold"
              >
                <Filter className="h-4 w-4" /> Estado:{" "}
                {statusFilter === "ALL"
                  ? "Todos"
                  : statusFilter === "ACTIVE"
                    ? "Activos"
                    : "Suspendidos"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setStatusFilter("ALL");
                  setPage(0);
                }}
              >
                Todos los Estados
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setStatusFilter("ACTIVE");
                  setPage(0);
                }}
              >
                Solo Activos
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setStatusFilter("INACTIVE");
                  setPage(0);
                }}
              >
                Suspendidos
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* TABLA DE DATOS */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden min-h-[400px]">
        <Table>
          <TableHeader className="bg-slate-50/80 sticky top-0">
            <TableRow>
              <TableHead className="w-12 text-center font-extrabold text-slate-700">
                N°
              </TableHead>
              <TableHead className="font-extrabold text-slate-700">
                Colaborador / Cuenta
              </TableHead>
              <TableHead className="font-extrabold text-slate-700">
                Rol Operativo
              </TableHead>
              <TableHead className="font-extrabold text-slate-700">
                Estado de Acceso
              </TableHead>
              <TableHead className="w-20 font-extrabold text-slate-700 text-center">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length > 0 ? (
              paginatedData.map((user, index) => (
                <TableRow
                  key={user.id}
                  className={`group transition-colors ${!user.isActive ? "bg-slate-50/50 opacity-80" : "hover:bg-slate-50/50"}`}
                >
                  <TableCell className="text-center font-bold text-slate-400">
                    {page * rowsPerPage + index + 1}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-lg ${user.isActive ? "bg-blue-600 text-white shadow-md" : "bg-slate-200 text-slate-400"}`}
                      >
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 leading-tight">
                          {user.name}
                        </span>
                        <span className="text-xs font-medium text-slate-500 mt-0.5">
                          {user.email}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {user.roles?.map((role: string) => (
                        <RoleBadge key={role} role={role} />
                      ))}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`font-bold flex items-center gap-1 w-fit border-none ${user.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}
                    >
                      {user.isActive ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {user.isActive ? "Cuenta Activa" : "Suspendido"}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4 text-slate-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Gestión de Cuenta</DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        <DropdownMenuItem asChild>
                          <Link
                            href={`/users/${user.id}/edit`}
                            className="cursor-pointer"
                          >
                            <Edit className="mr-2 h-4 w-4 text-blue-600" />{" "}
                            Editar Perfil
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={() =>
                            handleToggleStatus(user.id, user.isActive)
                          }
                          className={`cursor-pointer font-bold ${user.isActive ? "text-red-600 focus:text-red-600 focus:bg-red-50" : "text-green-600 focus:text-green-600 focus:bg-green-50"}`}
                        >
                          {user.isActive ? (
                            <>
                              <XCircle className="mr-2 h-4 w-4" /> Suspender
                              Acceso
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-2 h-4 w-4" />{" "}
                              Reactivar Acceso
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-48 text-center text-slate-400"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Users className="h-8 w-8 text-slate-200" />
                    <p>No se encontraron usuarios con esos filtros.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* CONTROLES DE PAGINACIÓN */}
      <div className="flex flex-col sm:flex-row items-center justify-between px-2 gap-4">
        <p className="text-xs text-slate-500 font-medium">
          Mostrando página{" "}
          <span className="font-bold text-slate-900">
            {totalPages > 0 ? page + 1 : 0}
          </span>{" "}
          de {totalPages || 1}
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Mostrar:</span>
            <select
              className="h-8 px-2 rounded-md border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-600 bg-white"
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(0);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || totalPages === 0}
            >
              Siguiente <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
