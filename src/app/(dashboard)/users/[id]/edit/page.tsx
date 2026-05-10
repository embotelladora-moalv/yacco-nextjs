import { userRepository } from "@/services/repositories/userRepository";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, UserCog } from "lucide-react";
import Link from "next/link";
import { UserForm } from "../../new/UserForm";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await userRepository.getById(id);

  if (!user) {
    notFound();
  }

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
            <UserCog className="h-6 w-6 text-blue-600" />
            Editar Perfil de Colaborador
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Actualiza los permisos, contacto o rol de <b>{user.name}</b>.
          </p>
        </div>
      </div>

      <UserForm initialData={user} />
    </div>
  );
}
