import { TruckForm } from "./TruckForm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default function NewTruckPage() {
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
      <TruckForm />
    </div>
  );
}
