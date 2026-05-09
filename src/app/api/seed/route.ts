// src/app/api/seed/route.ts
import { NextResponse } from "next/server";
import { seedManyCustomers } from "@/services/seed/customerSeed";

export async function GET() {
  // ADVERTENCIA: Solo para desarrollo local
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "No permitido" }, { status: 403 });
  }

  const result = await seedManyCustomers(100);
  return NextResponse.json(result);
}
