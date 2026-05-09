// src/app/(dashboard)/inventory/columns.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { KardexItem } from "@/services/repositories/inventoryRepository";
import { Badge } from "@/components/ui/badge";

const packagingLabels: Record<string, string> = {
  bottle: "Botella",
  box: "Caja",
  non_discardable: "Bidón",
};

export const columns: ColumnDef<KardexItem>[] = [
  {
    accessorKey: "productName",
    header: "Producto",
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("productName")}</span>
    ),
  },
  {
    accessorKey: "packagingType",
    header: "Envase",
    cell: ({ row }) => {
      const type = row.getValue("packagingType") as string;
      return <span>{packagingLabels[type] || type}</span>;
    },
  },
  {
    accessorKey: "volumeCapacity",
    header: "Capacidad",
    cell: ({ row }) => <span>{row.getValue("volumeCapacity")} L</span>,
  },
  {
    accessorKey: "warehouseLocation",
    header: "Ubicación",
    cell: ({ row }) => (
      <span className="capitalize">
        {String(row.getValue("warehouseLocation")).replace("_", " ")}
      </span>
    ),
  },
  {
    accessorKey: "quantityFull",
    header: "Stock (Llenos)",
    cell: ({ row }) => {
      const stock = parseFloat(row.getValue("quantityFull"));
      return (
        <Badge
          variant={stock > 10 ? "default" : "destructive"}
          className="text-sm"
        >
          {stock} und.
        </Badge>
      );
    },
  },
  {
    accessorKey: "lastUpdatedAt",
    header: "Última Actualización",
    cell: ({ row }) => {
      const date = row.getValue("lastUpdatedAt") as Date;
      return (
        <span className="text-gray-500 text-sm">
          {date.toLocaleDateString()} {date.toLocaleTimeString()}
        </span>
      );
    },
  },
];
