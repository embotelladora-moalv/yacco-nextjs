# Diseño: Mermas con motivo y cuadre de liquidación

> Documento de diseño producto de sesión de grill-me. Es la guía de
> implementación. NO codear sin revisar y aprobar este doc.
> Ubicación sugerida en repo: `docs/proyecto/DISENO-mermas-liquidacion.md`

---

## 1. Contexto y problema raíz

Lo que arrancó como "la merma no descuenta stock" resultó ser la punta de un
problema mayor en el cierre de liquidación de ruta. El grill destapó cinco
hallazgos, de distinta gravedad:

1. **Limbo de cuadre (causa raíz).** El campo de retorno (`quantityReturnedFull`)
   es libremente editable y está desacoplado de las ventas reales registradas
   en ruta. El form sugiere el retorno esperado (cargado − vendido), pero el
   encargado puede tipear cualquier número. Lo que no se justifica como
   vuelto ni merma **desaparece sin rastro**: no se cobra a nadie (la
   liquidación NO genera ventas) y no se descuenta como pérdida.

2. **Merma sin motivo ni Kardex (lo que disparó todo).** `wasteQuantity` es un
   número plano por lote. No genera ningún asiento de Kardex, no descuenta
   stock, no pide motivo. La merma "desaparece" de la contabilidad de ruta.

3. **Error de carga (flujo aparte).** Si lo anotado al despachar no coincide
   con lo realmente cargado (ej. anotado 10, real 11), el stock de planta
   queda corrupto **desde la apertura** (el descuento FIFO usó el número
   erróneo). `quantityLoaded` es inmutable una vez `ON_ROUTE`. Esto NO se
   resuelve en la liquidación — es un problema de la apertura.

4. **Anulación post-liquidación.** Hoy `LIQUIDATED` bloquea toda anulación de
   venta. Existe necesidad excepcional de corregir una venta mal registrada
   tras liquidar. **FUERA DE ALCANCE de este rediseño** (decisión tomada).

5. **`shrinkageReasons` son strings planos** en `systemSettings/config`, sin
   estructura para llevar el flag de reciclable. Prerequisito de datos.

---

## 2. Reglas de negocio (cerradas en el grill)

### Modelo de merma
- Toda merma se modela como **array por línea de carga**:
  `waste: [{ quantity, reasonId, isRecyclable }]`.
- Una misma línea puede tener **motivos mixtos** (ej. 2 rotos + 1 garantía).
- Granularidad: por **lote** (`lotNumber`), como hoy.

### Reciclable (binario)
- Cada motivo trae un **default** de reciclable (`isRecyclable` en el motivo).
- El encargado puede **override** por línea de merma (modelo C del grill).
- La merma **persiste el valor final** (no solo el motivo), porque el override
  se perdería si se guardara solo el `reasonId`.
- **Reciclable** → el envase vuelve a `stockEmpty` del **mismo producto**
  (mismo `productId`, distinta fase). El agua/contenido se da por perdido.
- **No reciclable** → no vuelve a ningún stock. Asiento de baja por pérdida.

### Asientos de Kardex por merma
Sobre el mismo `productId`:
- **Reciclable:**
  - `OUT / FILLED` (se perdió el lleno: agua + estado lleno).
  - `IN / EMPTY` (el envase vuelve a la pila de vacíos).
- **No reciclable:**
  - `OUT / FILLED` con `referenceType: "SHRINKAGE"` (baja total trazada).
  - Nada vuelve a stock.

### Cobro
- **Ninguna merma genera cobro.** Las ventas se registran en ruta vía
  `registerSale` (generan `sales`, deuda, balances). La liquidación es solo
  cuadre. El caso "cambio por garantía" (agua en mal estado) es reposición
  gratis: lleno que sale sin cargo + envase reciclable que entra. Se modela
  como un motivo de merma reciclable más (no flujo separado).

### Cuadre forzado (con válvulas)
- Regla: `vendido(real) + quantityReturnedFull + suma(waste) = quantityLoaded`.
- El "vendido real" sale de las ventas registradas del manifest (no del número
  editable). El sistema debe **forzar** que vuelto + merma cubran exactamente
  lo no vendido — **sin limbo posible**.
- **Válvula 1 — error de carga:** no se resuelve compensando en el cierre
  (eso solo mueve el error). Requiere un mecanismo de corrección de carga /
  ajuste de stock de planta, que es un flujo SEPARADO de la liquidación.
- **Válvula 2 — anulación post-liquidación:** fuera de alcance (ver §1.4).

---

## 3. Catálogo de motivos (migración de datos)

`shrinkageReasons` pasa de strings planos a objetos estructurados:

```
{
  id: string,
  name: string,            // "Caída en reparto - envase roto"
  phase: "FILLED" | "EMPTY",
  context: "ROUTE" | "PLANT",   // dónde aplica
  isRecyclableDefault: boolean,  // default del flag, override-able
  isActive: boolean
}
```

Hoy viven como arrays de strings en `systemSettings/config`
(`productionWasteReasons`, `routeWasteReasons`). La migración debe:
- Convertir cada string a objeto con los campos de arriba.
- Asignar `isRecyclableDefault` a cada motivo existente (decisión manual:
  ¿"Robo/Pérdida" reciclable? no. ¿"Caída - envase sano"? sí. etc.).
- **Aditiva, con dry-run + backup**, igual que la migración de customers.
- Producción `yacco-2026`: máximo cuidado, confirmar projectId, abortar si
  emulador.

> PENDIENTE de decidir con Giancarlo: el set inicial de motivos y su flag
> reciclable por defecto. Listar todos los `routeWasteReasons` actuales y
> asignar flag uno por uno.

---

## 4. Plan de fases (propuesto)

Partido para acotar riesgo. Cada fase = su propia rama, merge a develop,
build+test verde, push de Giancarlo. NO stackear.

### Fase 0 — Migración del catálogo de motivos
- Migrar `shrinkageReasons` strings → objetos (§3).
- Script de migración (dry-run, backup, verify) sobre prod.
- Sin cambios de UI todavía. Solo el dato.
- **Bloqueante de las fases siguientes** (todo depende del flag).

### Fase 1 — Merma con motivo + Kardex en liquidación
- Schema: `wasteQuantity` (número) → `waste: [{ quantity, reasonId, isRecyclable }]`.
- Repo `liquidateDispatch`: generar asientos de Kardex según reciclable (§2).
- UI `LiquidationForm`: por lote, poder agregar líneas de merma con motivo
  (dropdown del catálogo) + toggle reciclable (precargado del default).
- Validación de no-exceso: `vuelto + suma(waste) ≤ cargado`.
- **NO incluye cuadre forzado todavía** (eso es Fase 2). Acá solo se traza
  la merma correctamente.

### Fase 2 — Cuadre visible (iluminar el limbo, NO bloquear)

> Reformulada tras grill. NO es bloqueo rígido — decisión de Giancarlo:
> el encargado debe poder cerrar aunque no cuadre (error de carga, conteo
> apurado, etc.), pero el descuadre deja de ser invisible.

**Fuente del "vendido real":** las ventas registradas en ruta (colección
`sales`), cruzadas por `productId + lotNumber`. El vendido NO lo tipea el
liquidador — sale de las boletas (ya generaron deuda/cobro/SUNAT).

**Granularidad:** por `productId + lotNumber`. Las ventas guardan `lotNumber`
(confirmado). CORRIGE un bug existente: la sugerencia actual agrupa ventas
solo por producto e ignora el lote, repartiendo mal el vendido entre lotes.
Clave del agrupador debe ser `${productId}_${lotNumber}`.

**Mecánica (modelo A — retorno editable + descuadre en vivo):**
- El retorno se precarga con el sugerido (`cargado − vendido_real` por lote)
  pero sigue **editable** (el encargado cuenta físicamente).
- En vivo: `faltante(lote) = cargado − vendido_real − vuelto − suma(merma)`.
- Panel de descuadre por lote: muestra cuánto falta justificar.
- El encargado puede: clasificar el faltante como merma con motivo (Fase 1),
  corregir el vuelto, o **dejarlo como faltante sin justificar**.

**Faltante sin justificar (NO se bloquea el cierre):**
- Se permite cerrar con faltante.
- PERO el faltante queda **trazado**: se registra explícitamente (campo en el
  manifest) + asiento de Kardex `OUT/FILLED` con
  `referenceType: "UNRECONCILED_LOSS"` (distinto de `SHRINKAGE`).
- Igual que la merma: es traza de evento, el stock ya salió en el despacho,
  NO re-resta `stockFilled`/lote. Solo deja registro auditable.
- Diferencia con hoy: hoy el faltante DESAPARECE sin rastro. Con Fase 2 queda
  registrado y auditable (cuánto se perdió sin justificar por ruta).

**Tres destinos de lo no-vuelto (todos trazados):**
- Vendido → ya en `sales` (deuda/cobro/SUNAT).
- Merma con motivo → `SHRINKAGE`, reciclable o no (Fase 1).
- Faltante sin justificar → `UNRECONCILED_LOSS` (Fase 2).

**Query de ventas:** traer por `manifestId` (filtro simple, sin índice nuevo)
y filtrar `status == COMPLETED` en memoria (pocas ventas por manifest). NO
usar where compuesto manifestId+status (pediría índice nuevo).

**Error de carga (11 vs 10):** NO se resuelve en Fase 2. Aparecerá como un
faltante trazado (honesto). Su corrección de fondo (ajustar stock de planta)
es Fase 3. El cuadre visible NO bloquea, así que el error de carga no traba
el cierre.

### Fase 3 (futura, fuera de este ciclo)
- Corrección de carga / ajuste de stock de planta (válvula 1).
- Activar `registerShrinkage` de planta (ya existe backend, falta UI) +
  conectarlo al catálogo migrado.
- Anulación post-liquidación restringida (válvula 2).

> Orden recomendado: 0 → 1 → 2. La Fase 3 se evalúa después, según necesidad.

---

## 5. Verificaciones obligatorias (todas las fases)

- Solo-lectura primero para confirmar estado real antes de tocar.
- Scripts destructivos: dry-run + backup local + confirmar projectId + abortar
  si emulador.
- Probar en emulador con casos de borde explícitos (motivos mixtos, reciclable
  vs no, cuadre exacto, exceso rechazado).
- `npm run build` + `npm run test` verde ANTES de pedir merge.
- Una feature por rama, merge --no-ff, push lo hace Giancarlo.

---

## 6. Estado del código relevante (del diagnóstico)

- `dispatchRepository.liquidateDispatch` (~L336–442): transacción de cierre.
  Hoy: ROUTE_RETURN (IN/FILLED) y EMPTY_RETURN_LIQUIDATION (IN/EMPTY).
  `wasteQuantity` solo se guarda informativo, sin Kardex.
- `quantitySold = quantityLoaded − quantityReturnedFull − wasteQuantity`
  (L349). Informativo, NO genera venta.
- `liquidationItemSchema` / `liquidationManifestSchema` en `dispatchSchemas.ts`.
  superRefine: vuelto + merma ≤ cargado.
- `LiquidationForm.tsx`: input numérico de merma por fila. Precarga retorno
  sugerido (L66–88) de ventas registradas.
- `inventoryRepository.registerShrinkage` (L239): CÓDIGO MUERTO. Recibe
  reasonId, descuenta stock, Kardex OUT/LOSS. No maneja reciclable. Sin UI.
- `cancelSaleAction`: bloquea si manifest LIQUIDATED (salesRepository L1500).
- Manifest estados: PENDING → ON_ROUTE → LIQUIDATED (bloqueo total).
- Producto: `stockFilled` + `stockEmpty` en mismo doc; `isReturnableContainer`.
  Sin entidad envase separada.