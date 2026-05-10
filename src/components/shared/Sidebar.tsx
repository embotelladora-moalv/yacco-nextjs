"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Archive,
  Settings,
  LogOut,
  Droplet,
  Users,
  Truck,
  FileText,
  MapPin,
  Map,
  Navigation,
  ShoppingCart,
  HandCoins,
} from "lucide-react";
import { logoutAction } from "@/app/login/actions";

interface SidebarProps {
  user: {
    name: string;
    email?: string;
    role?: string;
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
      { name: "Kardex", href: "/inventory", icon: Archive },
      { name: "Producción", href: "/production", icon: ClipboardList },
      { name: "Catálogo", href: "/products", icon: Package },
    ],
  },
  {
    title: "Ventas y Clientes",
    items: [
      { name: "Directorio Clientes", href: "/customers", icon: Users },
      { name: "Pedidos y Ventas", href: "/orders", icon: ShoppingCart },
      { name: "Cobranzas", href: "/collections", icon: HandCoins }, // Módulo de amortización
      { name: "Facturación", href: "/billing", icon: FileText },
    ],
  },
  {
    title: "Logística y Flota",
    items: [
      { name: "Monitoreo de Rutas", href: "/routes", icon: Map },
      { name: "Despacho Rápido", href: "/dispatch", icon: Navigation }, // Centro de asignación
      { name: "Vehículos", href: "/trucks", icon: Truck },
    ],
  },
  {
    title: "Administración",
    items: [
      { name: "Usuarios", href: "/users", icon: Users },
      { name: "Ajustes", href: "/settings", icon: Settings },
    ],
  },
];

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const userRole = user?.role || "ADMIN";

  const visibleGroups = navigationGroups.filter((group) => {
    if (group.title === "Administración" && userRole !== "ADMIN") return false;
    if (
      group.title === "Logística y Flota" &&
      !["ADMIN", "PRODUCTION", "SALES"].includes(userRole)
    )
      return false;
    if (
      group.title === "Ventas y Clientes" &&
      !["ADMIN", "SALES"].includes(userRole)
    )
      return false;
    if (
      group.title === "Planta y Producción" &&
      !["ADMIN", "PRODUCTION"].includes(userRole)
    )
      return false;
    return true;
  });

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    : "Y";

  return (
    <div className="flex h-full w-full flex-col bg-white border-r">
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

      <div className="border-t p-4 bg-gray-50/40">
        <div className="flex items-center gap-3 mb-5 px-2">
          <div className="h-10 w-10 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-sm shadow-md border-2 border-white ring-1 ring-blue-100">
            {initials}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-bold text-gray-900 truncate">
              {user?.name || "Operador Yacco"}
            </span>
            <span className="text-[9px] font-extrabold text-blue-700 bg-blue-50 px-1.5 rounded uppercase w-fit">
              {userRole}
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
