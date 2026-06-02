# Product Backlog — Yacco ERP

Backlog en formato Scrum. Las historias están agrupadas por **épicas** y
priorizadas por valor / urgencia. Cada historia tiene criterios de
aceptación claros y una estimación en **Story Points** (escala Fibonacci:
1, 2, 3, 5, 8, 13).

## Roles

- **Product Owner (PO)**: dueño del negocio (gerencia Moalv).
- **Scrum Master (SM)**: rotativo entre el equipo dev.
- **Equipo Dev**: full-stack.
- **Stakeholders**: contabilidad, despacho, planta.

---

## Épicas

| Código | Épica | Estado |
|---|---|---|
| E-01 | Estabilización y seguridad | 🔴 Urgente |
| E-02 | Refactor a Clean Architecture | 🟠 Pendiente |
| E-03 | Worker SUNAT real | 🔴 Urgente |
| E-04 | Calidad y testing | 🟡 Pendiente |
| E-05 | Reportes y BI | 🟢 Futuro |
| E-06 | App móvil para choferes | 🟢 Futuro |
| E-07 | Integraciones (pagos, IA) | 🟢 Futuro |

---

# Épica E-01 — Estabilización y seguridad

> **Objetivo**: dejar el sistema en estado deployable a producción sin
> riesgos tributarios ni de seguridad.

> **Nota**: la US-001 original (renombrar `proxy.ts` → `middleware.ts`) se
> retiró del backlog. Era un error de análisis: Next.js 16 usa `proxy.ts`
> como convención oficial. Numeración mantenida desde US-002.

## US-002 — Corregir fecha de emisión de Guías de Remisión

**Como** facturador
**quiero** que las guías se emitan con la fecha del día actual
**para** que SUNAT las acepte correctamente.

**Criterios de aceptación**:
- [x] `issueDate` en `emitirGuiaRemisionAction` usa `new Date()`.
- [x] La hora también es la actual.
- [ ] Test unitario que verifica que `issueDate` es de hoy.

**Estimación**: 1 SP — **Prioridad**: P0 — **Ref**: BUG-02

---

## US-003 — Proteger el endpoint `/api/seed`

**Como** administrador del sistema
**quiero** que el endpoint de seed no sea público
**para** evitar que terceros inserten datos en la base de producción.

**Criterios de aceptación**:
- [x] El endpoint responde 404 (o 403) si `NODE_ENV === "production"`.
- [x] En desarrollo exige header `x-seed-token` que matchee
      `SEED_TOKEN` en `.env`.
- [x] Se documenta el proceso de seed local en el README.

**Estimación**: 2 SP — **Prioridad**: P0 — **Ref**: BUG-04

---

## US-004 — Configurar entornos SUNAT por variable de entorno

**Como** equipo de desarrollo
**quiero** que la URL de SUNAT venga de `.env`
**para** poder mover beta ↔ producción sin tocar código.

**Criterios de aceptación**:
- [ ] `SUNAT_BILL_SERVICE_URL` en `.env.local` y en `.env.example`.
- [ ] Tres llamadas hardcodeadas reemplazadas (`apiSunat.ts`,
      `sendSummaryToSunat`, `getTicketStatus`).
- [ ] El log del sistema indica claramente qué entorno está activo al
      arrancar.

**Estimación**: 2 SP — **Prioridad**: P1 — **Ref**: BUG-10

---

## US-005 — Quitar logs sensibles de producción

**Como** equipo de seguridad
**quiero** que no se logueen tokens ni payloads SUNAT en producción
**para** evitar fuga de credenciales.

**Criterios de aceptación**:
- [ ] `console.log` que imprime tokens es removido o gated por
      `NODE_ENV !== "production"`.
- [ ] Se introduce un logger (`pino` o el de Firebase Functions) con
      niveles.
- [ ] Se documenta en `CONTRIBUTING.md` la política de logging.

**Estimación**: 3 SP — **Prioridad**: P1 — **Ref**: BUG-11

---

# Épica E-02 — Refactor a Clean Architecture

> **Objetivo**: extraer la lógica de negocio de los Server Actions a casos
> de uso testeables.

## US-101 — Definir interfaces de repositorio

**Como** desarrollador
**quiero** que los repositorios implementen interfaces
**para** poder hacer mocks en los tests y desacoplar el dominio del backend.

**Criterios de aceptación**:
- [ ] Cada repositorio en `services/repositories/` tiene una interfaz en
      `core/use-cases/<dominio>/I<Entity>Repository.ts`.
- [ ] El repositorio implementa esa interfaz.
- [ ] Los Server Actions reciben la interfaz, no la implementación.

**Estimación**: 5 SP — **Prioridad**: P2 — **Ref**: BUG-05

---

## US-102 — Extraer `EmitirComprobanteUseCase`

**Como** desarrollador
**quiero** que la lógica de emisión de factura/boleta esté en un caso de
uso aislado
**para** poder testearla sin Next.js ni Firebase real.

**Criterios de aceptación**:
- [ ] Nuevo archivo `core/use-cases/billing/EmitirComprobanteUseCase.ts`.
- [ ] Recibe por constructor: `salesRepo`, `customerRepo`, `productRepo`,
      `correlativeService`, `sunatClient`, `storage`.
- [ ] Expone `execute({ saleIds, tipo }): Promise<EmitirResult>`.
- [ ] El Server Action `emitirComprobanteAction` solo instancia el caso de
      uso y delega.
- [ ] Tests unitarios con mocks cubren: cliente único, cliente distinto,
      sale inexistente, sin guías asociadas, con guías asociadas.

**Estimación**: 8 SP — **Prioridad**: P2 — **Ref**: BUG-05

---

## US-103 — Extraer `AnularComprobanteUseCase`

Idéntico al US-102 pero para anulación + consulta de ticket.

**Estimación**: 5 SP — **Prioridad**: P2

---

## US-104 — Extraer `EmitirGuiaRemisionUseCase`

Idéntico para guías. Incluye la lógica de cálculo de peso.

**Estimación**: 5 SP — **Prioridad**: P2

---

## US-105 — Unificar `CustomerLocation`

**Como** desarrollador
**quiero** una única definición de `CustomerLocation`
**para** no tener inconsistencias entre módulos.

**Criterios de aceptación**:
- [ ] Una sola interfaz `CustomerLocation` en `core/entities/CRM.ts`.
- [ ] La definición duplicada en `Customer.ts` se elimina.
- [ ] Todos los consumidores compilan con la interfaz unificada.

**Estimación**: 3 SP — **Prioridad**: P2 — **Ref**: BUG-07

---

## US-106 — Eliminar `any` de los repositorios

**Como** equipo
**queremos** tipado estricto en la capa de datos
**para** detectar errores en compile-time.

**Criterios de aceptación**:
- [ ] Helper `serializeDoc<T>()` con tipado genérico.
- [ ] Cero `as any` en `services/repositories/`.
- [ ] `tsconfig.json` con `"strict": true`.

**Estimación**: 8 SP — **Prioridad**: P2 — **Ref**: BUG-06

---

## US-107 — Domain Service `IgvCalculator`

**Como** desarrollador
**quiero** un único lugar donde se calcule el IGV
**para** centralizar reglas tributarias.

**Criterios de aceptación**:
- [ ] `core/services/IgvCalculator.ts` expone `calculateLine(qty, price)`
      y `calculateTotals(items)`.
- [ ] Todos los lugares que hoy calculan IGV usan el servicio.
- [ ] Tests con casos límite: 1 ítem, múltiples ítems, redondeos.

**Estimación**: 3 SP — **Prioridad**: P3 — **Ref**: BUG-09

---

# Épica E-03 — Worker SUNAT real

> **Objetivo**: que la Cloud Function llame a SUNAT real, no a una simulación.

## US-201 — Compartir `services/sunat/` con Cloud Functions

**Como** equipo
**queremos** reutilizar los servicios SUNAT entre Next.js y Cloud Functions
**para** no duplicar código.

**Criterios de aceptación**:
- [ ] Workspace npm configurado (raíz + `packages/sunat-core`).
- [ ] Los servicios de XML, firma y API están en `packages/sunat-core`.
- [ ] `functions/` y la app Next.js consumen el paquete.
- [ ] Build de ambos proyectos pasa.

**Estimación**: 8 SP — **Prioridad**: P0 — **Ref**: BUG-03

---

## US-202 — Implementar emisión real de GRE en el worker

**Como** chofer / despachador
**quiero** que al asignar pedidos con guía se generen guías reales en SUNAT
**para** poder mostrarlas al cliente y a fiscalización.

**Criterios de aceptación**:
- [ ] El worker `processSunatQueue` consume `referenceType: ORDER` y
      `requiresGuide: true`.
- [ ] Llama a `buildDespatchXml`, `signXml`, `sendGuiaToSunatRest`.
- [ ] Guarda el ticket y actualiza `sunatDocuments` con el resultado real.
- [ ] El pedido (`orders/{id}`) queda con `guideDocumentId` apuntando al
      documento real.
- [ ] Si SUNAT rechaza, la tarea queda en `ERROR` con el mensaje real.

**Estimación**: 8 SP — **Prioridad**: P0 — **Ref**: BUG-03

---

## US-203 — Polling de tickets GRE pendientes

**Como** sistema
**necesito** consultar periódicamente los tickets de guías pendientes
**para** confirmar si SUNAT las aceptó.

**Criterios de aceptación**:
- [ ] Cloud Function programada (scheduled) cada 5 minutos.
- [ ] Consulta documentos con `type: "09"` y `status: PENDING`.
- [ ] Llama a `getGreTicketStatusRest` y actualiza el estado.
- [ ] Tiene un máximo de 12 intentos (1 hora); luego marca como ERROR.

**Estimación**: 5 SP — **Prioridad**: P1

---

## US-204 — Reintento exponencial en fallas SUNAT

**Como** sistema
**necesito** reintentar el envío cuando SUNAT responde con timeouts
**para** no perder documentos por inestabilidad de su servicio.

**Criterios de aceptación**:
- [ ] El worker reintenta hasta 3 veces con backoff (30s, 2min, 10min).
- [ ] Solo reintenta en errores transitorios (5xx, network), no en errores
      de validación (4xx).
- [ ] La cola registra el número de intento.

**Estimación**: 5 SP — **Prioridad**: P2

---

# Épica E-04 — Calidad y testing

## US-301 — Setup de testing (Vitest)

- [ ] Vitest configurado.
- [ ] Un test de ejemplo corriendo en CI.
- [ ] Script `npm test` documentado.

**Estimación**: 3 SP — **Prioridad**: P1 — **Ref**: BUG-15

---

## US-302 — Tests del generador XML de facturas

- [ ] Validar contra el XSD oficial UBL 2.1 de SUNAT.
- [ ] Casos: 1 ítem, varios ítems, con guías asociadas, sin guías.
- [ ] Cobertura mínima 80% en `xmlGenerator.ts`.

**Estimación**: 5 SP — **Prioridad**: P2

---

## US-303 — CI/CD básico en GitHub Actions

- [ ] Workflow que corre lint + test + build en cada PR.
- [ ] Deploy automático a Vercel desde `main`.

**Estimación**: 5 SP — **Prioridad**: P2

---

## US-304 — Reemplazar `console.*` por logger estructurado

Ya cubierto en US-005, pero extiende a todo el código.

**Estimación**: 3 SP — **Prioridad**: P3

---

# Épica E-05 — Reportes y BI

## US-401 — Dashboard con ventas del día

- [ ] Página `/dashboard` muestra: ventas hoy, ventas semana, top clientes,
      stock bajo.
- [ ] Componentes con Recharts.
- [ ] Filtros por rango de fechas.

**Estimación**: 8 SP — **Prioridad**: P3

---

## US-402 — Reporte de cobranza por cliente

- [ ] Exportable a Excel.
- [ ] Saldo, antigüedad de deuda, último pago.

**Estimación**: 5 SP — **Prioridad**: P3

---

## US-403 — Reporte de operaciones SUNAT

- [ ] Listado de comprobantes emitidos en el rango.
- [ ] Filtros por tipo, estado, cliente.
- [ ] Export a XML/PDF agrupado.

**Estimación**: 5 SP — **Prioridad**: P3

---

# Épica E-06 — App móvil para choferes (futuro)

## US-501 — App de chofer (consulta de ruta)

- [ ] Login con el mismo Firebase Auth.
- [ ] Ver pedidos del día asignados.
- [ ] Marcar entrega y captura de firma.

**Estimación**: 21 SP (a romper en historias más pequeñas) — **Prioridad**: P4

---

# Épica E-07 — Integraciones futuras

- US-601 — Pasarela Yape/Plin para cobros (8 SP)
- US-602 — IA: predicción de demanda por zona y día (13 SP)
- US-603 — Integración con balanzas o flujómetros de planta (8 SP)

---

# Backlog priorizado (próximos 4 sprints)

| Sprint | Foco | Historias | Total SP |
|---|---|---|---|
| **Sprint 1** | Estabilización | US-002, US-003, US-004, US-005 | 8 |
| **Sprint 2** | Worker SUNAT real | US-201, US-202 | 16 |
| **Sprint 3** | Testing + ajustes | US-203, US-301, US-302 | 13 |
| **Sprint 4** | Refactor Clean Arch | US-101, US-102, US-105 | 16 |

> Velocidad asumida: 12–16 SP por sprint con un equipo de 2 devs. Ajustar
> tras el primer sprint usando la velocidad real. El Sprint 1 quedó liviano
> (8 SP) — buen sprint para calibrar la velocidad real y dejar buffer para
> imprevistos del setup inicial.

---

# Definition of Ready (DoR)

Una historia está lista para entrar a sprint cuando:

- [ ] Tiene criterios de aceptación claros.
- [ ] Está estimada por el equipo (planning poker).
- [ ] No depende de historias no terminadas (o la dependencia está clara).
- [ ] El PO confirmó la prioridad.
- [ ] Si toca SUNAT, el dueño funcional (contabilidad) ya validó el flujo.

# Definition of Done (DoD)

Una historia está terminada cuando:

- [ ] Código en `main` (vía PR aprobado por al menos 1 revisor).
- [ ] Tests unitarios pasan (si aplica).
- [ ] No introduce warnings de TypeScript ni de lint.
- [ ] Documentación actualizada (`README`, `ARQUITECTURA` o `CONTRIBUTING`
      según corresponda).
- [ ] Desplegada a entorno de QA y probada por el PO.
- [ ] Variables de entorno nuevas documentadas en `.env.example`.
