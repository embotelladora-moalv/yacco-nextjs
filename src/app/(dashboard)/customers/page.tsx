import { customerRepository } from "@/services/repositories/customerRepository";
import { CustomerTable } from "./CustomerTable";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Users,
  FileDown,
  FileSpreadsheet,
  FileText,
  Download,
  Map as MapIcon,
  Tags,
  Settings2,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default async function CustomersPage() {
  const customers = await customerRepository.getAll();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 pt-4">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 px-4 sm:px-0">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <Users className="h-8 w-8 text-blue-600" />
            Directorio de Clientes
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Gestión de cartera, ubicaciones y control financiero Moalv S.a.C.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {/* GRUPO 1: ACCIONES DE GESTIÓN ESTRATÉGICA */}
          <div className="flex gap-2">
            <Button
              asChild
              variant="outline"
              className="font-bold border-slate-200"
            >
              <Link href="/customers/map">
                <MapIcon className="mr-2 h-4 w-4 text-orange-500" /> Mapa
              </Link>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="font-bold border-slate-200"
                >
                  <Settings2 className="mr-2 h-4 w-4 text-slate-500" />{" "}
                  Herramientas <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Configuración CRM</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/customers/tags" className="cursor-pointer">
                    <Tags className="mr-2 h-4 w-4 text-blue-600" /> Gestionar
                    Etiquetas (Zonas)
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <FileText className="mr-2 h-4 w-4 text-slate-600" />{" "}
                  Actualización Masiva
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* GRUPO 2: CENTRO DE REPORTES Y DESCARGAS */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="gap-2 border-slate-200 shadow-sm font-bold text-slate-600"
              >
                <Download className="h-4 w-4" /> Reportes
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Exportar Datos</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <FileText className="mr-2 h-4 w-4 text-red-500" /> Exportar
                Cartera Completa (PDF)
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />{" "}
                Reporte de Deudas Actual (Excel)
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <FileDown className="mr-2 h-4 w-4 text-blue-600" /> Inventario
                de Envases Prestados
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* ACCIÓN PRINCIPAL */}
          <Button
            asChild
            className="bg-blue-700 hover:bg-blue-800 shadow-lg px-6 font-black"
          >
            <Link href="/customers/new">
              <Plus className="mr-2 h-5 w-5" /> Registrar Cliente
            </Link>
          </Button>
        </div>
      </div>

      <div className="px-4 sm:px-0">
        <CustomerTable initialData={customers} />
      </div>
    </div>
  );
}
