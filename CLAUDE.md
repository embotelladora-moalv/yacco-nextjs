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
│   ├── use-cases/               # ⚠️ Vacío (Clean Arch a medias)
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

- **Migración app viejo -> nuevo COMPLETA y verificada**: 21.213 docs, 0 huérfanos, tipos OK. Data sucia heredada conocida: 367 clientes con `documentId="123"` (placeholder viejo) pendientes de DNI/RUC real; 2 `debtAmount` negativos ~0 (float, inocuos).
- **Export Excel de clientes sin DNI**: `scripts/migration/export-missing-dni.ts`.
- **Patrón de lectura escalable implementado** (cursor + `count()` + `.select()` + Algolia) en clientes, ventas, pedidos, deudas, inventario, despacho. Helper: `services/repositories/_pagination.ts`. Doc: `docs/PATRON-LECTURA.md`.
- **kardex_logs**: saldo materializado en `products` + log con `resultingBalance`, escritura log+saldo en misma transacción. NUNCA sumar historial pa stock.
- **Geolocalización de clientes**: Extracción de lat/lng de enlaces de Google Maps (resolución de enlaces acortados `maps.app.goo.gl` con rate-limit y caché local, parser con prioridad pin > cámara > query). Actualizados 476 clientes con coordenadas y metadatos (`geoSource`, `geoStatus`) en Firestore.
- **Convención reforzada**: código en inglés, UI en español.
- **Doc académica I-VIII generada** en `docs/proyecto/` (con placeholders).
- **Atributo `hasTap` e Informe de Planta**: Se agregó el campo opcional/nullable `hasTap` (boolean) en la entidad `Product` para indicar si un envase/bidón tiene caño o no, configurable en el formulario de producto. Se implementó la página de reporte `/inventory/report` para desglosar el stock de envases en planta (llenos y vacíos) con y sin caño. Queda pendiente integrar los saldos de envases en clientes.

### Pendientes siguientes

- Reimport de DNIs (Prompt D) cuando el Excel esté lleno.
- Backfill kardex si el saldo materializado no existía (dry-run primero).
- Deploy índices: `firebase deploy --only firestore:indexes`.
- Rellenar placeholders doc académica (`docs/proyecto/PENDIENTES.md`).
- Bugs críticos vigentes: BUG-02 (fecha GRE), BUG-03 (worker real), BUG-04 (seed).

### Críticos pendientes (Sprint 1)

| Bug | Archivo | Qué hay que hacer |
|---|---|---|
| **BUG-03** | `functions/src/index.ts` | El worker `processSunatQueue` simula con `setTimeout`. Hay que llamar a los servicios SUNAT reales. |

### Deuda relevante

- `core/use-cases/` vacío — Clean Architecture incompleta.
- 63 ocurrencias de `as any` en el proyecto.
- `CustomerLocation` duplicado en `Customer.ts` y `CRM.ts` con shapes distintos.
- URL de SUNAT BETA hardcodeada en 3 archivos (debería ser env var).
- Sin tests.

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
