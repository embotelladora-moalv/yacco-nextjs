# CLAUDE.md

Guía de contexto para Claude Code. Este archivo se lee automáticamente al
inicio de cada sesión. **Mantenerlo corto, actualizado y veraz.**

---

## 1. Qué es este proyecto

**Yacco ERP** — sistema de gestión integral para **Embotelladora Moalv S.A.C.**
(RUC 20612769151), una embotelladora de agua peruana.

Cubre: CRM, pedidos, ventas en ruta, despacho, inventario/kardex, cobranzas,
finanzas y **facturación electrónica SUNAT** (facturas 01, boletas 03,
guías de remisión 09, notas de crédito 07, bajas RA).

Ubicación local del repo: `~/Desktop/claude-staging/yacco-nextjs/` (este es
el cwd durante las sesiones).

---

## 2. Stack — versiones reales

> ⚠️ Antes de aplicar cualquier convención de framework, verificar la versión
> en `package.json`. Este proyecto usa versiones modernas y algunas APIs
> cambiaron respecto a versiones LTS.

| Pieza | Versión | Notas |
|---|---|---|
| Next.js | **16.2.6** (App Router) | `proxy.ts` reemplazó a `middleware.ts` desde v16. NO renombrar. |
| React | 19.2.4 | |
| TypeScript | 5 | |
| Tailwind | 4 | Sin `tailwind.config` clásico — usa `@tailwindcss/postcss`. |
| Firebase | client 12, admin 13 | |
| Cloud Functions | Node 20 | En carpeta hermana `functions/` (no incluida en este repo aún). |
| Zod | 4 | API v4, cuidado con cambios respecto a v3. |
| shadcn/ui | 4 | Componentes en `src/components/ui/`. |

**Cosas que cambiaron y suelen confundir**:

- **Next.js 16**: el archivo de interceptación se llama `proxy.ts` y la
  función `proxy`, no `middleware`. Está en `src/proxy.ts`. **Esto es
  correcto** — no lo "corrijas".
- **Tailwind 4**: configuración por CSS (`@theme`), no por `tailwind.config.js`.
- **React 19**: `useFormState` se llama `useActionState`. `forwardRef`
  ya no es necesario en muchos casos.

---

## 3. Estructura

```
src/
├── app/
│   ├── (dashboard)/             # Rutas protegidas (auth + roles)
│   │   ├── <modulo>/
│   │   │   ├── page.tsx         # Lista
│   │   │   ├── actions.ts       # Server Actions ("use server")
│   │   │   ├── new/page.tsx
│   │   │   ├── [id]/...
│   │   │   └── <Modulo>{Form,Table,Client}.tsx
│   │   └── layout.tsx
│   ├── api/                     # Route Handlers (REST)
│   ├── actions/sunatActions.ts  # Server Actions globales SUNAT
│   ├── login/
│   └── page.tsx                 # ⚠️ Sigue siendo el template default
├── components/
│   ├── ui/                      # shadcn/ui
│   ├── shared/                  # Reutilizables (Sidebar, etc.)
│   └── sunat/                   # Panels específicos del flujo SUNAT
├── core/                        # Capa de dominio
│   ├── entities/                # Interfaces de dominio
│   ├── validations/             # Schemas Zod
│   ├── use-cases/               # Casos de uso de negocio (sales/saleReversal, customers/containerAdjustment)
│   └── utils/
├── services/
│   ├── firebase/                # admin.ts, auth.ts, config.ts
│   ├── repositories/            # Acceso a Firestore por entidad
│   ├── search/                  # Algolia
│   ├── sunat/                   # XML, firma, SOAP/REST, PDF, correlativos
│   └── settingsService.ts
├── lib/utils.ts                 # cn() y similares
└── proxy.ts                     # Next.js 16: interceptación + roles
```

---

## 4. Comandos

```bash
npm run dev               # Next.js dev
npm run build
npm run lint
npm run emulators         # Firebase emulators con import/export de data
npm run emulate           # Emulators + Next.js en paralelo (concurrently)
```

**Variables de entorno**: ver `.env.example` (a crear si no existe; las
claves están listadas en `docs/README.md`). No commitear `.env.local`.

---

## 5. Convenciones (resumen — detalle en `docs/CONTRIBUTING.md`)

- **Server Actions**: `"use server"` arriba, validar input con Zod,
  delegar al repositorio o caso de uso, llamar `revalidatePath`, retornar
  `{ success, ... }`.
- **Repositorios**: en `services/repositories/`, una constante con el
  nombre de la colección al inicio, usar transacciones para escrituras
  multi-entidad, `serverTimestamp()` en vez de `new Date()`.
- **Nombres**: componentes `PascalCase.tsx`, servicios `camelCase.ts`,
  actions terminan en `Action`, use cases en `UseCase`.
- **TypeScript estricto**: no introducir `any` nuevos. Si necesario,
  comentar el porqué y dejar `TODO` con número de historia.
- **Logs**: usar el logger del proyecto. Nunca loggear tokens, certificados,
  ni payloads SUNAT completos en producción.
- **Commits**: Conventional Commits — `feat(scope): ...`, `fix(scope): ...`.
- **Ramas**: `<tipo>/<id>-<slug>`, p. ej. `fix/bug-02-fecha-gre`.

---

## 6. Estado del proyecto (snapshot)

### Avances recientes

- **Cobranzas y Pago Dirigido COMPLETO**:
  - Confirmado que el sistema de cobranzas activo opera sobre `sales`/`debtPayments` (`salesRepository`).
  - Implementación de **Pago Dirigido**: Permite seleccionar ventas específicas de la lista de pendientes y asignar montos individuales (toggle FIFO/Dirigido en `PaymentForm`).
  - Autocalculo automático del monto total en modo dirigido en base a la suma de las asignaciones, marcando el input como `readOnly` para evitar discrepancias.
  - Validación estricta en el servidor mediante transacción de saldos re-leídos de Firestore.
  - Inclusión de `allocationMode` y `allocations` en `paymentSchema` y en los documentos de la colección `debtPayments`.
  - Auditoría del cobro utilizando el `userId` real del operador activo (obtenido con `getUserSession()`).
- **Catálogo de Bancos y Métodos de Pago COMPLETO**:
  - Colección dedicada `banks` (nombre, cuenta opcional, activo), administrable desde `/settings` únicamente por usuarios con rol `ADMIN`.
  - Al registrar cobranzas con método `TRANSFER`, se exige seleccionar banco (`bankId` + `bankName` desnormalizado). Los métodos `CASH` y `YAPE_PLIN` no requieren banco.
  - Métodos de pago de cobranza reducidos a 3 (`CASH`, `TRANSFER`, `YAPE_PLIN`). El método de pago de ventas (`sales`: `CASH`/`DIGITAL`/`CREDIT`/`MIXED`) es independiente y no se tocó.
- **Ficha de Cliente (Historial de Pagos) COMPLETO**:
  - La vista `CustomerProfileClient` ahora renderiza de forma integrada el historial de cobranzas en modo solo lectura (`showCancelButton={false}` sobre `PaymentHistoryList`). La anulación de pagos permanece reservada para la página de cobranza.
- **Consistencia Financiera y Fixes COMPLETA**:
  - Fix en `PaymentForm` y `CollectionForm` agregando `valueAsNumber: true` / coerciones necesarias para evitar errores de tipo en el monto ("expected number, received string").
  - Las ventas anuladas ya no figuran en cobranzas (la acción `cancelSaleAction` actualiza `remainingBalance` a 0 y las consultas de cobranza filtran por `status == "COMPLETED"`).
  - La Server Action `confirmOrderDeliveryAction` y el modal de entrega rápida en `DispatchDetailsClient.tsx` fueron eliminados por completo en la limpieza de código muerto, ya que eran redundantes y el flujo de entrega de pedidos se realiza de forma unificada mediante `/sales/new?orderId=`.
- **Trazabilidad de envases (3 fases) COMPLETA**:
  - Colección `customerContainerLogs` (`type`: `SALE`/`DELIVERY`/`ADJUSTMENT`/`REVERSAL`).
  - **Fase 1**: Escritura automática de logs en ventas y entregas en ruta.
  - **Fase 2**: Ajuste manual de balances absolutos de envases con motivo obligatorio y registro de auditoría, restringido únicamente a usuarios con rol `ADMIN` (`adjustContainerBalancesAction`).
  - **Fase 3**: Panel consolidado de envases en circulación en el reporte de inventario (`/inventory/report`) con desglose de circulación por producto, ranking de 10 principales deudores y lista de saldos a favor (devoluciones excedentes); además de un extracto de movimientos en la ficha de cada cliente resolviendo nombres de operadores.
- **Anulación de Ventas (Fase A) COMPLETA**:
  - Implementación de `cancelSaleAction` y lógica de reversa por contra-asiento.
  - Marca la venta como `CANCELLED` (no borra física) y realiza la devolución/reversión correspondiente de stock, lotes (reingreso a `productionBatch`), kardex, deuda económica, balances de envases, manifiesto de despacho y estado del pedido.
  - Bloqueos de seguridad activos: impide anulación de ventas facturadas, en cola de SUNAT, con manifiesto ya liquidado, con pagos aplicados o previamente anuladas.
- **Testing unitario con Vitest**:
  - Configuración y montaje de Vitest (`vitest` + `vite-tsconfig-paths`).
  - Suite de 26 pruebas unitarias robustas en `src/core/use-cases/` para `saleReversal.test.ts` (17 pruebas) y `containerAdjustment.test.ts` (9 pruebas).
  - Scripts configurados: `npm run test` y `npm run test:watch`.
- **Precios unitarios centralizados a 4 decimales**: Centralización en `core/utils/priceConfig` (`priceField` y `PRICE_STEP` a `0.0001`) para evitar errores de redondeo; la visualización de caja se conserva en 2 decimales.
- **Pedidos**: Tipo de venta por línea (`REFILL`/`FULL`/`BOTTLE`) con tarifas personalizadas por cliente; se establece la sede principal (`isMain`/`isDefault`) y tipo `REFILL` por defecto.
- **Pit-stop de ruta**: Fix de descuadres de stock (se aplican deltas acumulados en lugar de sobrescribir con valores absolutos), devolución de llenos por lote (permite corregir lotes erróneos y reingresar stock a su respectivo `productionBatch`) y actualización de la tarjeta de despacho mostrando ventas, cargas y stock a bordo en tiempo real.
- **Auditoría con usuarios reales**: Inyección del `userId` real del operador obtenido de la sesión activa (`getUserSession()`) en kardex y transacciones de inventario, eliminando los placeholders `ADMIN_ID`/`ADMIN_PLANT`.
- **Normalización de fines de línea**: Se agregó el archivo `.gitattributes` en la raíz para normalizar EOL (LF/CRLF) y evitar ruidos masivos en commits.
- **Migración app viejo COMPLETA**: 21k docs migrados, 0 huérfanos.
- **hasTap configurable por empaque**: Configuración de `hasTap` (`true`/`false`/`null`) y reportes en planta asociados.
- **Historial Global de Cobranzas COMPLETO**:
  - Implementación de la ruta `/collections/history` para consultar el histórico de cobros (todos los clientes por rango de fechas) de forma paginada y escalable (patrón de cursores + selector `pageSize`).
  - Cálculo eficiente en el servidor del total del período (ACTIVE) para todo el rango seleccionado usando `getActivePaymentsMetricsByDateRange` con `.select(...)` (evitando ráfaga de consultas y sin necesidad de índices compuestos adicionales, ya que usa el índice automático de campo único `createdAt`).
  - Mapeo robusto de nombres de clientes y de operadores que cobran (resolución de `receivedById` con fallback a "Sistema" para placeholders y "Usuario no registrado" para UIDs sin documento en la colección `users`).
  - Los cobros anulados (`status === "CANCELLED"`) se muestran con estilo visual distintivo (tachados/rojos) y quedan excluidos del total cobrado del período.
- **Limpieza de Código Muerto COMPLETA**:
  - Eliminación de archivos obsoletos y redundantes: `CollectionForm.tsx` y `paymentRepository.ts` (lógica vieja basada en `orders`/`payments`).
  - Remoción del modal latente de entrega rápida en `DispatchDetailsClient.tsx` y su Server Action `confirmOrderDeliveryAction`. El flujo unificado de entrega de pedidos reside en `/sales/new?orderId=`. Se limpiaron aproximadamente 532 líneas de código muerto.

### Pendientes siguientes

- 🚨 **DESPLEGAR ÍNDICES FIRESTORE (BLOQUEANTE)**: Varios filtros y consultas no funcionarán en base de datos real hasta ejecutar `firebase deploy --only firestore:indexes`. Afecta filtros de ventas anuladas (`status+createdAt`), historial de envases (`customerId+createdAt`), ordenación de bancos (`isActive+name` ASC) e historial de cobranza (nota: la consulta del historial global de cobranzas no requiere índice compuesto nuevo ya que usa `createdAt` como filtro de desigualdad y ordenamiento único).
- 🚨 **Fase B de Anulaciones (Nota de Crédito/Baja)**: Anulación de ventas ya facturadas mediante la emisión de Nota de Crédito (tipo 07) o Baja formal de Boletas/Facturas ante SUNAT.
- 🚨 **RESET de producción pendiente**: Proceso crítico para limpiar el histórico transaccional en pruebas antes de la puesta en marcha real (dejar clientes con deuda a 0 y productos con stock manual a 0). Requiere dry-run y dump local de seguridad previo.
- Reimport de DNIs (Prompt D) cuando el Excel esté lleno.
- Rellenar placeholders de la documentación académica (`docs/proyecto/`).
- Bugs críticos vigentes: BUG-02 (fecha GRE), BUG-03 (worker SUNAT real), BUG-04 (seed).

### Críticos pendientes (Sprint 1)

| Bug | Archivo | Qué hay que hacer |
|---|---|---|
| **BUG-03** | `functions/src/index.ts` | El worker `processSunatQueue` simula con `setTimeout`. Hay que llamar a los servicios SUNAT reales. |

### Deuda relevante

- Ocurrencias de `as any` en el proyecto (reducidas sustancialmente esta sesión, aunque persiste en los resolvers complejos de Zod/React Hook Form).
- Cobertura de tests unitarios inicial (26 tests unitarios montados en Vitest), requiere expandirse a otros casos de uso como el pago dirigido y la lógica de cobranzas (deuda de testing pendiente).
- `CustomerLocation` duplicado en `Customer.ts` y `CRM.ts` con shapes distintos.
- URL de SUNAT BETA hardcodeada en 3 archivos (debería ser env var).

### Lo que está bien (no romper)

- Generadores XML SUNAT (`services/sunat/xml*.ts`) — UBL 2.1 correcto.
- Firma XMLDSig con `xml-crypto` v6 — funciona, no tocar sin tests.
- `correlativeService.ts` — atomicidad con transacción Firestore.
- Repository Pattern bien aplicado.
- Cola asíncrona `sunatQueue` (el diseño, no el worker).

Documentación completa en `docs/REVISION-CODIGO.md`, `docs/ARQUITECTURA.md`,
`docs/BACKLOG.md`, `docs/SPRINT-PLAN.md`, `docs/CONTRIBUTING.md`.

---

## 7. Cómo trabajar conmigo en este proyecto

1. **Antes de cambiar código de SUNAT**: leer el archivo completo. La
   integración tributaria es estricta y un cambio mal hecho genera
   contingencias reales.
2. **Antes de "corregir" convenciones de framework**: confirmar la versión
   del paquete. Ejemplo del error reciente: yo asumí `middleware.ts`
   cuando Next.js 16 usa `proxy.ts`.
3. **Antes de tocar lógica de negocio**: revisar si existe un caso de uso
   en `core/use-cases/`. Si no, primero proponer extraerlo en vez de
   añadir más lógica al Server Action.
4. **Después de cambiar repositorios o entidades**: verificar el tipado en
   todos los consumidores (TypeScript ayuda, pero los `any` actuales
   ocultan errores).
5. **Cuando una historia está hecha**: marcar la casilla correspondiente
   en `docs/BACKLOG.md` y actualizar `docs/REVISION-CODIGO.md` si el bug
   queda cerrado.
6. **Si no estás seguro de algo del dominio peruano (SUNAT, ubigeo,
   correlativos)**: preguntar antes de inventar. Hay reglas muy específicas.

---

## 8. Glosario rápido (dominio)

| Término | Qué es |
|---|---|
| **SUNAT** | Autoridad tributaria peruana. |
| **RUC** | Registro Único de Contribuyente (11 dígitos, empresas). |
| **DNI** | Documento Nacional de Identidad (8 dígitos, personas). |
| **Boleta (03)** | Comprobante de venta a personas naturales (sin IGV detallado). |
| **Factura (01)** | Comprobante a empresas (con IGV detallado). |
| **Guía de Remisión (GRE, tipo 09)** | Documento de traslado de mercadería. |
| **Nota de Crédito (07)** | Anula o ajusta una factura/boleta. |
| **Comunicación de Baja (RA)** | Anulación formal ante SUNAT. |
| **CDR** | Constancia de Recepción que devuelve SUNAT. |
| **UBL 2.1** | Estándar XML que exige SUNAT para los comprobantes. |
| **Ubigeo** | Código de 6 dígitos que identifica un distrito peruano. |
| **IGV** | Impuesto General a las Ventas (18% en Perú). |
| **Manifiesto/Despacho** | Carga que sale en un camión a una ruta. |
| **Liquidación** | Cuadre al regreso del camión: ventas, vueltos, vacíos, mermas. |
| **FEFO** | First-Expired, First-Out — estrategia de consumo de lotes por fecha de vencimiento más próxima. |
| **Lote (ProductionBatch)** | Registro de producción diario por producto. Formato: `L-YYYYMMDD`. Tiene `currentStock` (stock vivo). |
| **Maquila** | Producción a nombre de otra marca. Los lotes de maquila se seleccionan manualmente en ventas. |
