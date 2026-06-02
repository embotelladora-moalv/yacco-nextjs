# Revisión de Código — Yacco ERP

Auditoría realizada sobre el snapshot del proyecto (Next.js 16.2.6,
React 19, Firebase). Los hallazgos están priorizados por severidad. Cada
bug tiene un ID que se referencia en `BACKLOG.md` para convertirlo en
historia.

## Convenciones

- 🔴 **Crítico**: bloqueante en producción o riesgo de seguridad/tributario.
- 🟠 **Alto**: deuda técnica significativa o bug funcional.
- 🟡 **Medio**: mejora de mantenibilidad o calidad.
- 🟢 **Bajo**: detalle o consistencia.

> **Nota histórica**: una versión previa de este documento incluía un
> "BUG-01" sobre `proxy.ts` vs `middleware.ts`. Estaba equivocado:
> **Next.js 16 renombró `middleware.ts` a `proxy.ts`** y la función
> exportada debe llamarse `proxy`. El archivo actual está correcto.
> Numeración mantenida desde BUG-02 para preservar trazabilidad.

---

## ✅ BUG-02 — Fecha de emisión de Guía de Remisión (SOLUCIONADO)

**Archivo**: `src/app/actions/sunatActions.ts`, línea ~525

Se ha reemplazado la fecha hardcodeada por la fecha actual del sistema.

```ts
const now = new Date();
const issueDate = now.toISOString().split("T")[0]; // YYYY-MM-DD
const issueTime = now.toTimeString().split(" ")[0];
```


---

## 🔴 BUG-03 — El Cloud Function worker es una simulación

**Archivo**: `functions/src/index.ts`

El worker `processSunatQueue` simula la emisión con `setTimeout` y genera
IDs aleatorios:

```ts
await new Promise((resolve) => setTimeout(resolve, 2000));
generatedSunatId = `F001-${Math.floor(Math.random() * 1000)}`;
```

**Impacto**: cualquier pedido marcado con `requiresGuide: true` (flujo de
asignación masiva a manifiestos con guías) queda marcado como "tiene guía"
en Firestore, pero **no existe ningún documento real ante SUNAT**.
Esto puede generar problemas tributarios graves cuando los inspectores pidan
el documento.

**Fix**: el worker debe llamar a las funciones reales que ya existen en
`src/services/sunat/`. Como Cloud Functions corre en otro proyecto npm,
hay tres opciones:

1. **Recomendada**: extraer `services/sunat/` a un paquete compartido
   (workspace npm o submódulo) que ambos proyectos consuman.
2. Duplicar los archivos en `functions/src/sunat/` (rápido, pero
   acumula deuda).
3. Que el worker llame a un endpoint interno HTTP del proyecto Next.js
   que sí tiene los servicios SUNAT (requiere autenticación interna).

---

## 🔴 BUG-04 — Endpoint `/api/seed` público y destructivo

**Archivo**: `src/app/api/seed/route.ts`

`GET /api/seed` no tiene autenticación y crea datos en producción
(productos, clientes, etc.). Si está desplegado:

```
curl https://tu-dominio.com/api/seed
```

cualquiera puede insertar registros y posiblemente sobrescribir IDs
existentes.

**Fix**:
- Mínimo: validar `process.env.NODE_ENV === "development"` y rechazar
  en producción.
- Mejor: validar un header secreto (`x-seed-token`) contra una variable
  de entorno.
- Ideal: mover seeders a un script CLI fuera de la app (`scripts/seed.ts`).

---

## 🟠 BUG-05 — `core/use-cases/` está vacío

La estructura del proyecto sugiere Clean Architecture, pero la capa de
Casos de Uso nunca fue implementada. Toda la lógica de negocio vive en:

- Server Actions (`actions.ts` por módulo).
- Repositorios (donde no debería).
- `sunatActions.ts` (>600 líneas mezclando orquestación, reglas, persistencia).

**Impacto**: difícil de testear, difícil de mantener, viola SRP.

**Fix**: ver `ARQUITECTURA.md` sección 5.1.

---

## 🟠 BUG-06 — Uso excesivo de `any` y `as any`

Conteo aproximado en `src/`: **63 ocurrencias** de `as any` + decenas de
`: any`.

**Ejemplos**:
- `orderRepository.ts:45` — `} as any;` al serializar
- `salesRepository.ts` — `any` en múltiples lugares
- `sunatActions.ts` — `any` en casi todas las desestructuraciones

**Impacto**: se pierde el valor de TypeScript. Los errores aparecen en
runtime en vez de compile-time.

**Fix**:
- Tipar correctamente la respuesta de Firestore con un helper genérico.
- Eliminar `any` de los repositorios devolviendo entidades del dominio.
- Activar `"noImplicitAny": true` y `"strict": true` en `tsconfig.json`
  si no lo está.

---

## 🟠 BUG-07 — Duplicación de la interfaz `CustomerLocation`

Se define en dos lugares con campos distintos:

- `core/entities/Customer.ts`: usa `latitude`, `longitude`, `isDefault`,
  `photoUrl`, `contact`.
- `core/entities/CRM.ts`: usa `coordinates: { lat, lng }`, `isMain`,
  `contactName`, `contactPhone`.

**Impacto**: confusión sobre cuál es la fuente de verdad. El código en
distintos archivos consume una u otra.

**Fix**: unificar en una sola interfaz, elegir el shape correcto (probable
mente el de `CRM.ts` ya que es el que más se usa), y eliminar el otro.

---

## 🟠 BUG-08 — Inyección XML en sobres SOAP

**Archivos**: `apiSunat.ts`, `sunatActions.ts` (función `sendSummaryToSunat`)

Los sobres SOAP se arman con interpolación de string:

```ts
<wsse:Username>${ruc}${user}</wsse:Username>
<wsse:Password ...>${password}</wsse:Password>
```

Si alguna credencial llegara a contener `<`, `&` o `"`, el XML se rompe.
En el caso de credenciales SUNAT esto es improbable, pero el mismo patrón
se usa para `fileName` que viene de variables más controlables.

**Fix**: escapar las variables que se interpolan en XML, o usar un builder
(`xmlbuilder2`) como ya se usa en `xmlGenerator.ts`.

---

## 🟠 BUG-09 — IGV y peso por bidón hardcodeados en múltiples lugares

- `IGV_RATE = 0.18` aparece en `xmlGenerator.ts` y en otros lados.
- `21 kilos aprox por bidón` (`return acc + item.quantity * 20`) está en
  `sunatActions.ts:emitirGuiaRemisionAction` (el comentario dice 21 pero el
  código multiplica por 20). El peso correcto depende del producto.

**Impacto**:
- Si SUNAT cambia el IGV (raro pero pasó en 2017), hay que cazarlo.
- La guía declara peso incorrecto si el cliente compra Bidón 7L o Caja 1L.

**Fix**:
- `IgvCalculator` como domain service.
- Agregar `weightKg` al entity `Product` y leerlo al armar la guía.

---

## 🟠 BUG-10 — Endpoint SUNAT en BETA en producción

**Archivos**: `apiSunat.ts`, `sunatActions.ts:sendSummaryToSunat`,
`sunatActions.ts:getTicketStatus`.

URL hardcodeada:
```ts
const endpoint = "https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService";
```

**Impacto**: cuando se pase a producción habrá que tocar tres archivos.
Riesgo de olvidar uno.

**Fix**: extraer a `SUNAT_BILL_SERVICE_URL` como variable de entorno.

---

## 🟡 BUG-11 — Logs de producción con `console.log/error`

Hay 16+ `console.log` en `services/` y `app/actions/`. Algunos imprimen
información sensible (`token.substring(0, 50)`, payloads SUNAT).

**Fix**:
- Usar un logger configurable (pino, winston, o el `logger` de Firebase
  Functions ya importado).
- En cliente, no logear nada sensible.

---

## 🟡 BUG-12 — Respositorios mezclan serialización con dominio

En `orderRepository.getOrderById()` y en `salesRepository`, el repositorio
convierte fechas a ISO strings antes de retornar para que Next.js pueda
serializarlas a Client Components.

**Impacto**: el dominio queda contaminado con preocupaciones de transporte.
La entidad `Order` dice `expectedDeliveryDate: Date` pero el repositorio
retorna `string`.

**Fix**:
- Capa de mapeo explícita (`OrderMapper.toDTO(order)`).
- O tipar dos interfaces: `Order` (dominio, con `Date`) y `OrderDTO`
  (transporte, con `string`).

---

## 🟡 BUG-13 — `revalidatePath` repetido en cada action

Cada server action repite las mismas llamadas a `revalidatePath()`. Si
cambia una ruta hay que actualizar varios archivos.

**Fix**: helper `revalidateOrderRoutes()` que centralice qué rutas
invalidar tras un cambio en pedidos.

---

## 🟡 BUG-14 — Falta manejo del caso "correlativo gastado"

Si SUNAT rechaza la emisión después de que `getNextSequence()` ya
incrementó el contador, ese correlativo queda como "hueco" en la
numeración.

**Recomendación**: SUNAT permite huecos, pero conviene:
1. Registrar en `sunatDocuments` el correlativo gastado con estado
   `REJECTED` para tener trazabilidad.
2. O reservar el correlativo en una colección `pendingSequences` y
   confirmarlo al final.

---

## 🟡 BUG-15 — No hay tests

No existe carpeta `__tests__/`, `tests/` ni configuración de Vitest/Jest.

**Recomendación**: priorizar tests de:
- Generadores XML (validar contra esquemas oficiales).
- `correlativeService` (lógica atómica crítica).
- Casos de uso de facturación una vez extraídos.

---

## 🟢 BUG-16 — Inconsistencia de estados de documento

En el código de guías:
```ts
status: "VOID_PENDING", // Usamos pending porque la API REST es asíncrona
```

Se reutiliza el estado de anulación para guías en proceso. Funciona,
pero el nombre es engañoso. Crear `GRE_PENDING` o usar `PENDING` real.

---

## 🟢 BUG-17 — `src/app/page.tsx` es el template de Next.js

La página raíz sigue siendo el demo de `create-next-app`. Debería
redirigir a `/login` o `/dashboard` según sesión.

---

## 🟢 BUG-18 — Mezcla de imports CRLF/LF

Varios archivos tienen `\r\n` (Windows) y otros `\n` (Unix). Causa diffs
ruidosos en Git.

**Fix**: agregar `.gitattributes`:
```
* text=auto eol=lf
```
Y un `.editorconfig`.

---

## Resumen ejecutivo

| Categoría | Cantidad |
|---|---|
| 🔴 Críticos | 3 (BUG-02, 03, 04) |
| 🟠 Altos | 6 (BUG-05 a 10) |
| 🟡 Medios | 5 (BUG-11 a 15) |
| 🟢 Bajos | 3 (BUG-16 a 18) |

**Recomendación para el próximo sprint**: cerrar los 3 críticos antes de
cualquier desarrollo nuevo. Especialmente BUG-02 (emisión rota) y BUG-03
(guías fantasma).

---

## Lo que está bien hecho

No todo es deuda. Vale la pena reconocer las decisiones acertadas:

- ✅ **Uso correcto de `proxy.ts`** según la convención de Next.js 16.
- ✅ **Generadores XML SUNAT bien separados** por tipo de documento.
- ✅ **Firma XMLDSig real** con `xml-crypto` v6 (no es trivial — SUNAT es
  estricta con C14N).
- ✅ **Correlativos atómicos** con transacción Firestore.
- ✅ **Repository pattern** aplicado consistentemente.
- ✅ **Server Actions con Zod** para validación de entrada.
- ✅ **Cola asíncrona** (sunatQueue) — el diseño es correcto, solo falta
  el worker real.
- ✅ **Storage organizado por tipo de documento** (`sunat/xml/facturas/`,
  `sunat/cdr/guias/`, etc.).
- ✅ **Manejo del CDR oculto en ZIP** de errores de SUNAT con descompresión
  para extraer el mensaje real — esto es un detalle fino que solo se
  descubre con experiencia.
- ✅ **Anulación en dos pasos** (envío + consulta de ticket) implementada
  correctamente según el protocolo SUNAT.
