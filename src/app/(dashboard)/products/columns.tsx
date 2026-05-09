// src/app/(dashboard)/products/columns.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Product } from "@/core/entities/Product";
import { Badge } from "@/components/ui/badge"; // Opcional: npx shadcn@latest add badge

// Definimos cómo se verá cada columna de nuestra entidad Product
export const columns: ColumnDef<Product>[] = [
  {
    accessorKey: "name",
    header: "Nombre del Producto",
  },
  {
    accessorKey: "volumeCapacity",
    header: "Capacidad",
    cell: ({ row }) => {
      const volume = parseFloat(row.getValue("volumeCapacity"));
      return <div className="font-medium">{volume} L.</div>;
    },
  },
  {
    accessorKey: "packagingType",
    header: "Tipo de Envase",
    cell: ({ row }) => {
      const type = row.getValue("packagingType") as string;
      const formattedType =
        type === "bottle"
          ? "Botella"
          : type === "box"
            ? "Caja"
            : "No Descartable";
      return <div>{formattedType}</div>;
    },
  },
  {
    accessorKey: "hasTap",
    header: "Caño",
    cell: ({ row }) => {
      const hasTap = row.getValue("hasTap") as boolean;
      return <div>{hasTap ? "✅ Sí" : "❌ No"}</div>;
    },
  },
  {
    accessorKey: "isMaquila",
    header: "Maquila",
    cell: ({ row }) => {
      const isMaquila = row.getValue("isMaquila") as boolean;
      return <div>{isMaquila ? "🏭 Sí" : "---"}</div>;
    },
  },
];
