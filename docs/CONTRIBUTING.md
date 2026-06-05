# Guía de contribución — Yacco ERP

Convenciones para mantener el código consistente entre el equipo.

---

## 1. Stack y herramientas

- Node.js >= 20
- npm
- TypeScript 5+
- **Next.js 16+** (App Router)
- Firebase CLI

> ⚠️ **Convenciones específicas de versión**: este proyecto usa Next.js 16,
> React 19 y Tailwind 4. Antes de "corregir" patrones que parezcan
> anticuados, confirmá el changelog. Casos comunes:
> - `proxy.ts` (no `middleware.ts`).
> - `useActionState` (no `useFormState`).
> - Sin `tailwind.config.js` clásico (se usa `@theme` en CSS).

Recomendado: VS Code con las extensiones de **ESLint**, **Prettier**,
**Tailwind CSS IntelliSense** y **Error Lens**.

---

## 2. Estructura de carpetas (qué va dónde)

| Ubicación | Qué va aquí | Qué NO va aquí |
|---|---|---|
| `src/app/(dashboard)/<modulo>/` | Páginas, components específicos del módulo, `actions.ts` (Server Actions). | Lógica de negocio compleja. |
| `src/app/api/` | Route Handlers REST puros (webhooks, APIs externas, IA). | Acceso directo a Firestore — usar repositorios. |
| `src/components/ui/` | shadcn/ui. | Componentes con lógica de negocio. |
| `src/components/shared/` | Componentes reutilizables entre módulos. | Componentes que solo usa un módulo (mover a `app/<mod>/`). |
| `src/core/entities/` | Interfaces/types del dominio. | Lógica con efectos. |
| `src/core/validations/` | Schemas Zod. | Inferencias de tipo de Firestore. |
| `src/core/use-cases/` | Casos de uso (lógica de negocio orquestada). | Llamadas directas a Firebase. |
| `src/services/repositories/` | Acceso a Firestore (CRUD por entidad). | Reglas de negocio. |
| `src/services/sunat/` | Generación XML, firma, llamadas a SUNAT. | Persistencia de documentos (eso es repositorio). |
| `src/lib/` | Utilidades genéricas (cn, formatters). | Lógica de dominio. |

**Regla simple**: si tu archivo importa `firebase-admin`, no debería estar
en `core/`.

---

## 3. Convenciones de código

### 3.1 Nombres

- Archivos de componente React: `PascalCase.tsx` (`SaleForm.tsx`).
- Archivos de utilidades / servicios: `camelCase.ts` (`apiSunat.ts`).
- Server Actions: en `actions.ts` por módulo, función `<verb><Entity>Action`.
  Ejemplo: `createOrderAction`, `assignOrdersBulkAction`.
- Casos de uso: `<Verbo><Entidad>UseCase` (`EmitirComprobanteUseCase`).
- Interfaces: sin prefijo `I` excepto para interfaces de repositorios y
  puertos (`IOrderRepository`).

### 3.2 TypeScript

- `"strict": true` en `tsconfig.json`.
- Prohibido `any`. Si es inevitable, dejar comentario explicando por qué y
  poner un TODO con número de historia.
- Para deserializar Firestore, usar el helper `serializeFirestoreData()`
  o un mapper explícito.
- Preferir `type` para uniones y `interface` para shapes que pueden
  extenderse.

### 3.3 React / Next.js

- Components asíncronos solo en Server Components.
- Marcar Client Components con `"use client"` arriba.
- No usar `useEffect` para cosas que pueden hacerse en el servidor.
- Server Actions: siempre `"use server"` arriba, siempre validar el input
  con Zod antes de tocar el repositorio.

```ts
// Patrón estándar de un Server Action
"use server";

export async function doSomethingAction(data: SomethingInput) {
  try {
    const parsed = somethingSchema.parse(data);
    const result = await somethingUseCase.execute(parsed);
    revalidatePath("/somewhere");
    return { success: true, result };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
```

### 3.4 Errores

- En el servidor, lanzar `Error` con mensajes claros en español.
- En el cliente, mostrar errores con `sonner` (toast).
- Nunca usar `alert()` ni `console.log` para feedback al usuario.

### 3.5 Logging

- Cliente: solo `console.error` para errores que el usuario no ve.
- Servidor: `logger.info`, `logger.warn`, `logger.error` (importar de
  `firebase-functions/logger` en Functions, o del logger del proyecto en
  Next.js).
- **Nunca** loggear: tokens, contraseñas, certificados, payloads SUNAT
  completos en producción.

### 3.6 Firestore

- Toda escritura no trivial dentro de una transacción o batch.
- Los timestamps usan `admin.firestore.FieldValue.serverTimestamp()` para
  consistencia, **no** `new Date()`.
- Los nombres de colección como **constantes** al inicio del repositorio:
  `const ORDERS = "orders"`.
- **Nombres de colecciones:** Todas las colecciones y subcolecciones de Firestore deben usar **camelCase** estrictamente (ej: `financeCategories`, `shrinkageReasons`, `kardexLogs`). Queda prohibido usar `snake_case` o `kebab-case` para nuevos desarrollos.

---

## 4. Branching y commits

### 4.1 Ramas

```
main                        ← producción (protegida)
├── develop                 ← integración
│   ├── feat/us-101-repo-interfaces
│   ├── fix/bug-02-fecha-gre
│   └── refactor/use-cases
```

- Una rama por historia o bug del backlog.
- Nombre: `<tipo>/<id>-<slug-corto>`.
  - `feat/`, `fix/`, `refactor/`, `chore/`, `docs/`, `test/`.

### 4.2 Commits — Conventional Commits

```
<tipo>(<scope>): <descripción corta en imperativo, minúscula>

<cuerpo opcional explicando el porqué>

<footer opcional: Closes #123, BREAKING CHANGE: ...>
```

**Tipos**: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `style`,
`perf`.

**Ejemplos**:

```
feat(billing): emitir guía consolidada con múltiples pedidos

fix(sunat): usar fecha actual al emitir guía de remisión

   La fecha estaba hardcodeada al 2026-05-19 lo que causaba que
   las guías emitidas otros días llevaran fecha incorrecta.

   Closes #US-002

refactor(orders): extraer EmitirPedidoUseCase

test(sunat): cubrir XML generator contra XSD oficial
```

### 4.3 Pull Requests

Plantilla mínima del PR:

```markdown
## Qué cambia
Breve descripción del cambio.

## Historia / Bug
Closes #US-002 (o BUG-02, etc.)

## Cómo se probó
- [ ] Caso 1
- [ ] Caso 2

## Capturas (si aplica)

## Checklist
- [ ] Tests pasan
- [ ] No introduce warnings de TS/ESLint
- [ ] `.env.example` actualizado si hay nuevas vars
- [ ] Documentación actualizada
```

**Reglas**:
- Mínimo 1 reviewer.
- No mergear con tests en rojo.
- Squash & merge a `develop` (commits limpios).
- Merge a `main` solo desde `develop` con tag de release.

---

## 5. Testing

### 5.1 Qué se testea

| Capa | Cobertura objetivo | Herramienta |
|---|---|---|
| Generadores XML SUNAT | > 90% | Vitest + validación XSD |
| Casos de uso | > 80% | Vitest con mocks |
| Repositorios | Integración con emulador | Vitest + Firebase Emulator |
| Componentes UI críticos | > 60% | Vitest + Testing Library |

### 5.2 Convenciones

- Archivos `*.test.ts` o `*.spec.ts` colocados junto al archivo testeado.
- Mocks de Firebase en `src/__mocks__/firebase.ts`.
- No hacer red real en tests, salvo el flag `RUN_E2E=1`.

---

## 6. Variables de entorno

- Nunca commitear `.env.local`.
- Mantener `.env.example` actualizado con todas las claves (con valores
  dummy o vacíos).
- Documentar cada variable en el README cuando se agregue.
- Variables con `NEXT_PUBLIC_` son **públicas** — no poner secretos ahí.

---

## 7. Seguridad

- Nunca commitear: certificados PFX, llaves privadas, tokens, RUC de
  clientes en mocks.
- `git secrets` o `gitleaks` recomendado como pre-commit hook.
- Los seeders nunca se ejecutan en producción (US-003).
- Cualquier endpoint público nuevo debe explicitar si requiere auth en
  el PR.

---

## 8. Performance

- En Server Components que listan datos: paginar siempre. Nunca traer la
  colección completa.
- En Client Components: lazy-load componentes pesados (mapa, gráficos).
- Imágenes con `next/image`.

---

## 9. Accesibilidad

- Todo botón con `aria-label` si no tiene texto visible.
- Forms con `<label htmlFor>` asociado.
- Color no es el único indicador (usar íconos + texto).

---

## 10. Cómo agregar un módulo nuevo (plantilla)

1. Crear `core/entities/<Modulo>.ts` con la interfaz.
2. Crear `core/validations/<modulo>Schema.ts` con Zod.
3. Crear `services/repositories/<modulo>Repository.ts` con CRUD.
4. Crear `core/use-cases/<modulo>/` con los casos de uso necesarios.
5. Crear `app/(dashboard)/<modulo>/`:
   - `page.tsx` (lista)
   - `actions.ts` (Server Actions)
   - `<Modulo>Table.tsx`, `<Modulo>Form.tsx`
   - `new/page.tsx` y `[id]/edit/page.tsx`
6. Agregar entrada al `Sidebar`.
7. Actualizar el `matcher` del `proxy.ts` si la ruta requiere protección.
8. Documentar en el README.

---

## 11. Code review checklist (para reviewers)

- [ ] El cambio resuelve la historia/bug declarado.
- [ ] No introduce `any` nuevos sin justificación.
- [ ] No hay `console.log` que no debería estar.
- [ ] No hay credenciales ni datos sensibles.
- [ ] Los nombres son claros (en español si describe negocio, inglés si
      describe técnica).
- [ ] Si toca SUNAT: el flujo está documentado o trazado.
- [ ] Si toca seguridad: se probó el caso negativo (sin sesión, rol
      incorrecto, etc.).
- [ ] Si toca convenciones de framework: el cambio coincide con la versión
      del framework declarada en `package.json` (ver advertencia §1).
