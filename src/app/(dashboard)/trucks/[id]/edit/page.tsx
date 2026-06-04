import { truckRepository } from "@/services/repositories/truckRepository";
import { TruckForm } from "../../new/TruckForm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTruckPage({ params }: PageProps) {
  const { id } = await params;
  const truck = await truckRepository.getById(id);

  if (!truck) notFound();

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/50 pb-10 pt-6 px-4">
      <div className="max-w-2xl mx-auto mb-6">
        <Link href="/trucks">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-slate-500 hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4" /> Volver a la Flota
          </Button>
        </Link>
      </div>
      {/* Al pasar el initialData, el formulario sabe que debe actualizar y no crear */}
      <TruckForm initialData={truck} />
    </div>
  );
}
