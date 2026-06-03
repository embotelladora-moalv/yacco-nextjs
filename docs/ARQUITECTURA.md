# Arquitectura — Yacco ERP

Este documento describe la arquitectura **real** del proyecto (lo que está
construido hoy), evalúa los **patrones aplicados** y propone la dirección
arquitectónica a futuro.

---

## 1. Vista de capas

El proyecto intenta seguir una arquitectura limpia (Clean Architecture) con
tres capas, aunque la capa de Casos de Uso está vacía:

```
┌────────────────────────────────────────────────────────────────┐
│                      PRESENTACIÓN (Next.js 16)                 │
│   app/(dashboard)/*  ·  components/*  ·  Server Actions        │
└──────────────────────────┬─────────────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────────────┐
│                         DOMINIO                                │
│   core/entities/  ·  core/validations/  ·  core/use-cases/ ❌  │
└──────────────────────────┬─────────────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────────────┐
│                     INFRAESTRUCTURA                            │
│  services/repositories/  ·  services/sunat/  ·  services/fire… │
│  Firebase (Firestore, Auth, Storage)  ·  Cloud Functions       │
└────────────────────────────────────────────────────────────────┘
```

| Capa | Responsabilidad actual | Estado |
|---|---|---|
| **Presentación** | Páginas, componentes, Server Actions como controladores. | ✅ Implementada |
| **Dominio** | Entidades (`core/entities`), validaciones Zod (`core/validations`). | ⚠️ Parcial. Falta `core/use-cases/`. |
| **Infraestructura** | Repositorios Firestore, servicios SUNAT, Firebase Admin SDK. | ✅ Implementada |

---

## 2. Patrones aplicados

### 2.1 Repository Pattern ✅

Cada entidad de dominio tiene un repositorio en `services/repositories/` que
encapsula el acceso a Firestore.

**Ejemplo** (`orderRepository.ts`):
- `createOrder()`, `getOrderById()`, `assignOrdersBulk()`, etc.
- El Server Action consume el repositorio, nunca habla directo a Firestore.

**Cumplimiento**: bueno en repositorios simples. Falla en `salesRepository` y
`billingRepository` donde se mezcla lógica de negocio (cálculo de IGV,
correlativos, transacciones multi-entidad).

### 2.2 Server Actions como Application Layer ⚠️

Los archivos `actions.ts` de cada módulo y `app/actions/sunatActions.ts`
actúan como capa de aplicación: validan input, orquestan repositorios y
revalidan rutas.

**Problema**: `sunatActions.ts` tiene >600 líneas y mezcla:
- Orquestación (correcto).
- Reglas de negocio: cálculo de peso por bidón, validación de ubigeo, IGV.
- Llamadas directas a la API SOAP/REST de SUNAT.
- Persistencia.

Esto debería romperse en **casos de uso** (`core/use-cases/`) que se
inyecten al Server Action.

### 2.3 Producer–Consumer / Queue Pattern ✅

Para emisión asíncrona de documentos SUNAT:

```
[ Server Action ]──escribe──▶[ Firestore: sunatQueue ]
                                       │
                                       ▼ onDocumentCreated
                             [ Cloud Function worker ]
                                       │
                          ┌────────────┼────────────┐
                          ▼            ▼            ▼
                    [ orders ]    [ sales ]   [ sunatDocs ]
```

**Estado actual**: el worker (`functions/src/index.ts`) está **simulado**
con `setTimeout` y IDs aleatorios. **No** llama a los servicios SUNAT reales.
Ver `REVISION-CODIGO.md` (BUG-03).

### 2.4 Transaction Script / Unit of Work ✅

Uso correcto de `adminDb.runTransaction()` y `adminDb.batch()` en:
- `salesRepository.registerSale()` (atomicidad cliente + venta + stock).
- `orderRepository.assignOrdersBulk()`.
- `billingRepository.emitInvoiceTransaction()`.

### 2.5 Service Layer (SUNAT) ✅

`services/sunat/` separa responsabilidades por archivo:

| Archivo | Responsabilidad |
|---|---|
| `xmlGenerator.ts` | Construye XML UBL 2.1 de facturas/boletas. |
| `xmlVoidGenerator.ts` | XML de comunicación de bajas. |
| `xmlDespatchGenerator.ts` | XML de guías de remisión. |
| `xmlSigner.ts` | Firma XMLDSig con certificado PFX. |
| `apiSunat.ts` | Cliente SOAP (facturas, bajas, getStatus). |
| `apiSunatRest.ts` | Cliente REST OAuth2 (guías GRE). |
| `pdfGenerator.ts` | Genera el PDF del comprobante con QR. |
| `correlativeService.ts` | Genera correlativos atómicos por serie. |

**Buena separación**. Esta es la mejor parte del proyecto.

### 2.6 Proxy de seguridad (Next.js 16) ✅

`src/proxy.ts` implementa control de acceso por rol y redirecciones de
sesión. **Esto es la convención correcta de Next.js 16** — el framework
renombró `middleware.ts` a `proxy.ts` en esta versión para clarificar que
opera en la frontera de red. La función exportada se llama `proxy`.

Si el equipo upgradeó desde Next.js 15 o anterior, hay un codemod oficial
de Next.js que hace el rename automático (`npx @next/codemod ...`).

---

## 3. Modelo de datos (Firestore)

```
customers/{customerId}
  - documentNumber (DNI/RUC)
  - locations[] (sedes con ubigeo, lat/lng)
  - containerBalances[] (envases prestados)
  - debtAmount
  - alwaysRequiresBilling

orders/{orderId}                    # Reserva / pedido futuro
  - customerId, locationId
  - items[]
  - expectedDeliveryDate
  - status: PENDING|ASSIGNED|DELIVERED|CANCELLED
  - manifestId (cuando se asigna a un camión)
  - guideRequested, guideDocumentId

sales/{saleId}                      # Venta real ejecutada en ruta
  - customerId
  - items[], totalAmount
  - manifestId
  - isBilled, sunatDocumentId

dispatchManifests/{manifestId}
  - driverId, truckPlate, dispatchDate
  - items[] (con lote)
  - returnedEmpties[]
  - status: PENDING|ON_ROUTE|LIQUIDATED

sunatDocuments/{documentId}         # F001-000123, T001-000045, etc.
  - type: 01|03|07|09
  - status: PENDING|ACCEPTED|REJECTED|VOIDED|VOID_PENDING
  - saleIds[]
  - xmlUrl, cdrUrl, pdfUrl (paths en Storage)
  - voidTicket, voidReason

sunatQueue/{taskId}                 # Cola asíncrona
  - referenceId, referenceType (ORDER|SALE)
  - requiresBilling, requiresGuide
  - status: PENDING|PROCESSING|SUCCESS|ERROR

sunatCounters/{serie}               # F001, B001, T001, RA-YYYYMMDD
  - current

products/{productId}
  - sku, basePrice
  - stockFilled, stockEmpty

trucks/{truckId}     dailyRoutes/{routeId}     batches/{batchId}
users/{uid}          finance/{movementId}      payments/{paymentId}
```

---

## 4. Flujo crítico: emisión de factura consolidada

```
Usuario selecciona ventas en /billing
      │
      ▼
emitirComprobanteAction(saleIds, "01"|"03")        ← Server Action
      │
      ├─ Lee ventas + cliente + productos
      ├─ Calcula totales (IGV 18%)
      ├─ getNextSequence("F001") → correlativo atómico
      ├─ buildInvoiceXml(invoiceInfo)              ← xmlGenerator
      ├─ signXml(rawXml)                           ← xmlSigner (PFX)
      ├─ sendInvoiceToSunat(file, signedXml)       ← SOAP a SUNAT
      ├─ guarda XML, CDR y PDF en Storage
      ├─ crea registro en sunatDocuments
      └─ batch update sales (isBilled = true)
```

**Riesgos detectados**:
- Si falla el guardado del PDF, la factura igual queda aprobada (controlado
  con try/catch interno).
- Si falla el envío a SUNAT después de generar el correlativo, ese
  correlativo se pierde (gap en la numeración). SUNAT permite esto, pero
  conviene reintentar antes de cerrar el correlativo.

---

## 5. Brechas arquitectónicas (próximos pasos)

### 5.1 Implementar la capa de Casos de Uso

Mover la lógica de negocio fuera de los Server Actions:

```
core/use-cases/
├── billing/
│   ├── EmitirComprobanteUseCase.ts
│   ├── AnularComprobanteUseCase.ts
│   └── ConsultarTicketBajaUseCase.ts
├── orders/
│   ├── CrearPedidoUseCase.ts
│   └── AsignarPedidosARutaUseCase.ts
└── sales/
    └── RegistrarVentaUseCase.ts
```

Cada caso de uso recibe sus dependencias por constructor (repositorios,
servicios SUNAT), expone un único método `execute()` y no conoce Next.js.

### 5.2 Definir interfaces para los repositorios

Hoy los repositorios son objetos literales. Convertirlos en clases o
factories que implementen una interfaz permite:
- Hacer mocks para tests unitarios.
- Cambiar Firestore por otro backend sin tocar los casos de uso.

```ts
// core/use-cases/orders/IOrderRepository.ts
export interface IOrderRepository {
  createOrder(data: OrderInput): Promise<string>;
  getOrderById(id: string): Promise<Order | null>;
  // ...
}
```

### 5.3 Domain Services para reglas transversales

Crear servicios de dominio para lógica que hoy está dispersa:

- `IgvCalculator` — cálculo del IGV 18% en un único lugar.
- `WeightEstimator` — peso por bidón (hoy `21 kg` hardcodeado).
- `SunatSerieResolver` — qué serie corresponde a qué tipo de documento.

### 5.4 Eliminar el worker simulado

`functions/src/index.ts` debe llamar a los servicios reales (`apiSunatRest`,
`buildDespatchXml`, `signXml`). Hoy solo simula.

### 5.5 Tests

No hay tests. Priorizar:
1. Unit tests de generadores XML (validar contra esquemas SUNAT).
2. Unit tests de cálculo de IGV y totales.
3. Tests de integración del flujo de emisión (con mock de SUNAT).

---

## 6. Diagrama de despliegue

```
┌─────────────────┐         ┌──────────────────────┐
│   Cliente Web   │◀───────▶│   Vercel / Hosting   │
│   (Navegador)   │  HTTPS  │   Next.js 16 App     │
└─────────────────┘         └──────────┬───────────┘
                                       │ Admin SDK
                                       ▼
                            ┌─────────────────────┐
                            │   Firebase Project  │
                            │  ┌───────────────┐  │
                            │  │ Firestore     │  │
                            │  │ Auth          │  │
                            │  │ Storage       │  │
                            │  │ Functions     │  │
                            │  └───────┬───────┘  │
                            └──────────┼──────────┘
                                       │ Trigger onCreate
                                       ▼
                            ┌─────────────────────┐
                            │  Cloud Function     │
                            │  processSunatQueue  │
                            └──────────┬──────────┘
                                       │ HTTPS
                                       ▼
                            ┌─────────────────────┐
                            │   SUNAT (BETA/PROD) │
                            │   SOAP + REST       │
                            └─────────────────────┘
```

---

## 7. Decisiones arquitectónicas registradas (ADR-light)

| # | Decisión | Razón |
|---|---|---|
| 1 | Next.js 16 + App Router + Server Actions | Aprovechar el modelo full-stack, evitar API routes intermedias. |
| 2 | `proxy.ts` para interceptación | Convención de Next.js 16 (reemplaza `middleware.ts`). |
| 3 | Firebase como backend único | Velocidad de desarrollo, autenticación y storage integrados. |
| 4 | Repositorios por entidad | Aislar el acceso a datos del resto del sistema. |
| 5 | Cola en Firestore + Cloud Function | Desacoplar la emisión SUNAT del request del usuario (resiliente a timeouts). |
| 6 | XML firmado en runtime con `xml-crypto` v6 | Cumplir el estándar XMLDSig que exige SUNAT con C14N real. |
| 7 | Certificado SUNAT en `.env` como Base64 | Evitar archivos físicos en el servidor. |
| 8 | shadcn/ui sobre Tailwind 4 | Componentes accesibles sin lock-in. |
