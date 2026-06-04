import { UserForm } from "./UserForm";
import { Button } from "@/components/ui/button";
import { ChevronLeft, UserPlus } from "lucide-react";
import Link from "next/link";

export default function NewUserPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10 pt-6 px-4 sm:px-0">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="rounded-full">
          <Link href="/users">
            <ChevronLeft className="h-6 w-6" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-blue-600" />
            Registrar Nuevo Colaborador
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Crea un perfil para el personal de planta, oficina o ruta.
          </p>
        </div>
      </div>

      <UserForm />
    </div>
  );
}
