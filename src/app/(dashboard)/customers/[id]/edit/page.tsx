import { customerRepository } from "@/services/repositories/customerRepository";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { CustomerForm } from "../../CustomerForm";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await customerRepository.getCustomerById(id);
  if (!customer) notFound();

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/50 pb-10 pt-6 px-4">
      <div className="max-w-4xl mx-auto mb-6">
        <Link href="/customers">
          <Button variant="ghost" size="sm" className="gap-2 text-slate-500">
            <ChevronLeft className="h-4 w-4" /> Volver al Directorio
          </Button>
        </Link>
      </div>
      <CustomerForm initialData={customer} />
    </div>
  );
}
