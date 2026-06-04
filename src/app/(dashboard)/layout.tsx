// src/app/(dashboard)/layout.tsx
import { Sidebar } from "@/components/shared/Sidebar";
import { getUserSession } from "@/services/firebase/auth"; // <-- Importamos la utilidad
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Droplet } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Obtenemos la sesión real desde el servidor de Node.js
  const user = await getUserSession();

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden">
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden md:block w-64 border-r bg-white shadow-sm shrink-0">
        <Sidebar user={user} />
      </aside>

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* HEADER MÓVIL */}
        <header className="flex h-14 items-center gap-4 border-b bg-white px-4 md:hidden shrink-0">
          <Sheet>
            <SheetTrigger
              className={`${buttonVariants({ variant: "outline", size: "icon" })} shrink-0`}
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <Sidebar user={user} />
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2">
            <Droplet className="h-5 w-5 text-blue-600" />
            <span className="font-bold text-gray-900 uppercase tracking-tighter">
              Yacco
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
