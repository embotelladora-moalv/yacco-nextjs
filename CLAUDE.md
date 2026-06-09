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
│   ├── use-cases/               # Casos de uso de negocio (sales/saleReversal, customers/containerAdjustment, sales/resolvePrice)
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
npm run test              # Vitest suite
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

- **Dashboard (3 métricas clave)**:
  - Ingresos por periodo (6 meses, status COMPLETED, bordes de mes en hora Perú UTC-5, Recharts).
  - Ventas por producto del mes (cursor 500, cruce con `products`, visualización en tabla).
  - Top clientes: Deudores (índice `isActive+debtAmount`) y Volumen (volumen del mes por `customerId`).
- **Rediseño COMPLETO de mermas/liquidación (Fases 0-3c)**:
  - **Fase 0**: `shrinkageReasons` migrado a objetos estructurados + UI settings + normalización legacy.
  - **Fase 1**: Merma con motivo en ruta (`waste[]` por lote), reciclable→stockEmpty / no-reciclable→baja. Kardex `SHRINKAGE`.
  - **Fase 2**: Cuadre visible contra ventas reales (`productId+lotNumber`), faltante trazado `UNRECONCILED_LOSS` (delta:0).
  - **Fase 3a**: Merma de planta (`registerShrinkage`), kardex DELTA REAL (planta SÍ descuenta), validación lote-primero.
  - **Fase 3b**: Corrección de carga resuelta mediante el uso del flujo de *pit-stop*.
  - **Fase 3c**: Anulación post-liquidación para ventas NO facturadas (ADMIN, stock a planta, kardex `POST_LIQUIDATION_RETURN`). Gate de roles: post-liquidación solo ADMIN.
- **Fecha+hora de cierre en liquidación**: Selector `datetime-local` con rango validado y helper `formatPeruDateTime` (America/Lima).
- **Mejoras técnicas y tipado**:
  - `CustomPrice` unificado en `CRM.ts`, `resolvePrice` tipado sin `as any`.
  - `tsconfig`: `scripts/` excluido del build de producción.
  - `.gitignore`: `scripts/verify/` ignorado.
- **Migración Aditiva de Customers COMPLETO**: Actualización de 604 documentos en producción (`yacco-2026`).
- **Resolución de Precios (Use-Case resolvePrice) COMPLETO**: Lógica extraída y compartida entre `SaleForm` y `OrderForm`.
- **Testing unitario con Vitest**: Suite de **48 pruebas unitarias** robustas.

### Pendientes siguientes

- 🚨 **DESPLEGAR ÍNDICES FIRESTORE (BLOQUEANTE)**: Ejecutar `firebase deploy --only firestore:indexes`. El índice `isActive+debtAmount` es necesario para el top deudores en producción.
- 🚨 **git push origin develop**: Sincronizar commits locales pendientes de subir.
- 🚨 **Fase B de Anulaciones (Nota de Crédito)**: Anulación de ventas facturadas ante SUNAT (dependencia de Fase 3c).
- **BUG-03 (crítico)**: Worker `processSunatQueue` real (no simulado).
- **Tests de integración**: Cobertura para `registerSale`, *pit-stop*, y flujo SUNAT/IGV.
- **Dashboard**: Selector de rango de fechas (hoy es fijo: mes actual / 6 meses).

### Críticos pendientes (Sprint 1)

| Bug | Archivo | Qué hay que hacer |
|---|---|---|
| **BUG-03** | `functions/src/index.ts` | El worker `processSunatQueue` simula con `setTimeout`. Hay que llamar a los servicios SUNAT reales. |

### Deuda relevante

- **BUG-02**: Error de fecha en Guías de Remisión (GRE).
- **BUG-04**: Error en el seed de datos.
- `CustomerLocation` duplicado en `Customer.ts` y `CRM.ts`.
- `slugifyReason` mal ubicado en `dateUtils` (debería ir a utils de strings).
- ~380 advertencias de linter (`any` preexistentes).

### Lo que está bien (no romper)

- Generadores XML SUNAT (`services/sunat/xml*.ts`) — UBL 2.1 correcto.
- Firma XMLDSig con `xml-crypto` v6.
- `correlativeService.ts` — atomicidad con transacción Firestore.
- Repository Pattern bien aplicado.

Documentación completa en `docs/REVISION-CODIGO.md`, `docs/ARQUITECTURA.md`,
`docs/BACKLOG.md`, `docs/SPRINT-PLAN.md`, `docs/CONTRIBUTING.md`.

---

## 7. Cómo trabajar conmigo en este proyecto

1. **Antes de cambiar código de SUNAT**: leer el archivo completo. La
   integración tributaria es estricta.
2. **Antes de tocar lógica de negocio**: revisar si existe un caso de uso
   en `core/use-cases/`.
3. **Después de cambiar repositorios o entidades**: verificar el tipado en
   todos los consumidores.
4. **Si no estás seguro de algo del dominio peruano (SUNAT, ubigeo,
   correlativos)**: preguntar antes de inventar.

---

## 8. Glosario rápido (dominio)

| Término | Qué es |
|---|---|
| **SUNAT** | Autoridad tributaria peruana. |
| **RUC** | Registro Único de Contribuyente (11 dígitos). |
| **DNI** | Documento Nacional de Identidad (8 dígitos). |
| **Boleta (03) / Factura (01)** | Comprobantes de pago electrónicos. |
| **Guía de Remisión (GRE, 09)** | Documento de traslado. |
| **Nota de Crédito (07)** | Anulación o ajuste. |
| **Liquidación** | Cuadre al regreso del camión: ventas, vueltos, vacíos, mermas. |
| **Lote (ProductionBatch)** | Registro diario: `L-YYYYMMDD`. |
