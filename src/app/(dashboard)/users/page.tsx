import { userRepository } from "@/services/repositories/userRepository";
import { UserTable } from "./UserTable";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import Link from "next/link";

export default async function UsersPage() {
  const users = await userRepository.getAll();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-center px-4 sm:px-0">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-600" /> Colaboradores
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Gestión de roles y accesos de planta y ruta.
          </p>
        </div>

        <Button
          asChild
          className="bg-blue-700 hover:bg-blue-800 font-bold shadow-lg"
        >
          <Link href="/users/new">
            <Plus className="mr-2 h-5 w-5" /> Nuevo Usuario
          </Link>
        </Button>
      </div>

      <UserTable initialData={users} />
    </div>
  );
}
