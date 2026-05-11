"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Archive,
  Settings,
  LogOut,
  Droplet,
  Users,
  Truck,
  FileText,
  Navigation,
  ShoppingCart,
  HandCoins,
  Wallet,
  ClipboardCheck,
} from "lucide-react";
import { logoutAction } from "@/app/login/actions";

interface SidebarProps {
  user: {
    name: string;
    email?: string;
    // ACTUALIZADO: Ahora esperamos un arreglo de roles, tal como está en Firebase
    roles?: string[];
  } | null;
}

const navigationGroups = [
  {
    title: "Principal",
    items: [{ name: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Planta y Producción",
    items: [
      { name: "Kardex de Envases", href: "/inventory", icon: Archive },
      // { name: "Producción", href: "/production", icon: ClipboardList },
    ],
  },
  {
    title: "Ventas y Clientes",
    items: [
      { name: "Clientes (CRM)", href: "/customers", icon: Users },
      { name: "Pedidos / Reservas", href: "/orders", icon: ClipboardCheck },
      { name: "Historial de Ventas", href: "/sales", icon: ShoppingCart },
    ],
  },
  {
    title: "Logística y Flota",
    items: [
      { name: "Despacho y Rutas", href: "/dispatch", icon: Navigation },
      { name: "Vehículos", href: "/trucks", icon: Truck },
    ],
  },
  {
    title: "Administración y Caja",
    items: [
      { name: "Finanzas y Gastos", href: "/finance", icon: Wallet },
      { name: "Cobranzas", href: "/collections", icon: HandCoins },
      { name: "Facturación", href: "/billing", icon: FileText },
      { name: "Usuarios", href: "/users", icon: Users },
      { name: "Ajustes", href: "/settings", icon: Settings },
    ],
  },
];

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  // Extraemos el array de roles (Si no tiene, le asignamos "ADMIN" temporalmente por seguridad/desarrollo)
  const userRoles =
    user?.roles && user.roles.length > 0 ? user.roles : ["ADMIN"];

  // Función Helper: Verifica si el usuario tiene al menos uno de los roles requeridos
  const hasPermission = (allowedRoles: string[]) => {
    if (userRoles.includes("ADMIN")) return true; // El ADMIN siempre ve todo
    return userRoles.some((role) => allowedRoles.includes(role));
  };

  // Filtramos los grupos según los roles del usuario
  const visibleGroups = navigationGroups.filter((group) => {
    if (group.title === "Administración y Caja")
      return hasPermission(["ADMIN"]);
    if (group.title === "Logística y Flota")
      return hasPermission(["ADMIN", "PRODUCTION", "SALES", "DISPATCHER"]);
    if (group.title === "Ventas y Clientes")
      return hasPermission(["ADMIN", "SALES"]);
    if (group.title === "Planta y Producción")
      return hasPermission(["ADMIN", "PRODUCTION"]);
    return true; // El grupo "Principal" (Dashboard) lo ven todos
  });

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    : "OP";

  return (
    <div className="flex h-full w-full flex-col bg-white border-r">
      {/* LOGO SECCIÓN */}
      <div className="flex h-16 items-center gap-3 border-b px-6 shrink-0 bg-white">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-700 text-white shadow-lg">
          <Droplet className="h-6 w-6" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-xl font-black tracking-tighter text-gray-900">
            YACCO
          </span>
          <span className="text-[9px] font-bold text-blue-700 uppercase tracking-tight">
            Moalv S.a.C.
          </span>
        </div>
      </div>

      {/* MENÚ DE NAVEGACIÓN */}
      <nav className="flex-1 space-y-7 px-4 py-8 overflow-y-auto overflow-x-hidden">
        {visibleGroups.map((group) => (
          <div key={group.title}>
            <h3 className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${isActive ? "text-blue-700" : "text-gray-400"}`}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* PERFIL Y CIERRE DE SESIÓN */}
      <div className="border-t p-4 bg-gray-50/40">
        <div className="flex items-center gap-3 mb-5 px-2">
          <div className="h-10 w-10 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-sm shadow-md border-2 border-white ring-1 ring-blue-100">
            {initials}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-bold text-gray-900 truncate">
              {user?.name || "Operador Yacco"}
            </span>
            {/* ACTUALIZADO: Muestra todos los roles del usuario separados por una coma */}
            <span className="text-[9px] font-extrabold text-blue-700 bg-blue-50 px-1.5 rounded uppercase w-fit truncate">
              {userRoles.join(", ")}
            </span>
          </div>
        </div>

        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 hover:border-red-200 transition-all"
          >
            <LogOut className="h-4 w-4" /> Finalizar Jornada
          </button>
        </form>
      </div>
    </div>
  );
}
