import { dispatchRepository } from "@/services/repositories/dispatchRepository";
import { userRepository } from "@/services/repositories/userRepository";
import { DispatchDashboard } from "./DispatchDashboard";

export const dynamic = "force-dynamic";

export default async function DispatchPage() {
  // 1. Obtenemos todos los despachos
  const rawDispatches = await dispatchRepository.getRecentDispatches();

  // 2. Serializamos los despachos (Convertimos Timestamps de Firebase a Strings ISO)
  const dispatches = rawDispatches.map((dispatch: any) => ({
    ...dispatch,
    dispatchDate: dispatch.dispatchDate?.toDate
      ? dispatch.dispatchDate.toDate().toISOString()
      : dispatch.dispatchDate,
    liquidatedAt: dispatch.liquidatedAt?.toDate
      ? dispatch.liquidatedAt.toDate().toISOString()
      : dispatch.liquidatedAt,
    createdAt: dispatch.createdAt?.toDate
      ? dispatch.createdAt.toDate().toISOString()
      : dispatch.createdAt,
    updatedAt: dispatch.updatedAt?.toDate
      ? dispatch.updatedAt.toDate().toISOString()
      : dispatch.updatedAt,
  }));

  // 3. Obtenemos y serializamos los usuarios
  const rawUsers = await userRepository.getAll();
  const users = rawUsers.map((user) => ({
    ...user,
    createdAt:
      user.createdAt instanceof Date
        ? user.createdAt.toISOString()
        : user.createdAt,
    updatedAt:
      user.updatedAt instanceof Date
        ? user.updatedAt.toISOString()
        : user.updatedAt,
  }));

  return (
    <div className="max-w-[1400px] mx-auto pb-10 pt-4 px-4 sm:px-6">
      {/* Ahora ambos arreglos contienen solo objetos planos (strings y números) */}
      <DispatchDashboard dispatches={dispatches} users={users as any} />
    </div>
  );
}
