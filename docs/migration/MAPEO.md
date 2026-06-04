# MAPEO: Schema viejo → Schema nuevo

**Proyecto viejo:** `moalv-ac994`  
**Proyecto nuevo:** Yacco ERP (este repo)  
**Generado:** 2026-06-03 con `scripts/migration/inspect-old-db.ts`  
**Estado:** Referencia — NO correr migración todavía

---

## Resumen de colecciones

| Colección vieja | Colección nueva | Estrategia |
|---|---|---|
| `brands` | _(ninguna)_ | Denormalizar en `products.brandName` |
| `cashMovements` | `cashMovements` | Migrar con transformación de campos |
| `categoryCustomers` | _(ninguna)_ | Migrar como `tags[]` en `customers` |
| `categoryProducts` | _(ninguna)_ | Deprecar — nuevo esquema no usa categoría de producto |
| `counters` | `counters` | Copiar directamente |
| `customers` | `customers` | Migrar con transformación profunda |
| `distributions` | `dispatchManifests` | Renombrar + reestructurar `movements` |
| `movements` | `kardex_logs` | Migrar con inferencia de `phase` y `type` |
| `paymentReasons` | `finance_categories` | Migrar con normalización de `type` |
| `products` | `products` | Migrar con colapso de 4 precios a 3 |
| `uselessReasons` | `shrinkage_reasons` | Nueva colección (crear en nuevo proyecto) |
| `users` | `users` | Migrar con cambio de `role` a `roles[]` |
| `vehicles` | `trucks` | Renombrar + agregar campos nuevos |
| `vouchers` | `sales` | Renombrar + extraer `envases` → `sales.returnedEmpties` |

---

## Detalle por colección

---

### `brands` → _(denormalizar)_

El viejo tenía una colección `brands` con documentos `{ name, createdAt, updatedAt }`.

Todos los productos y movimientos embebían la marca como `brand: { id, name }`.

**Decisión:** No migrar como colección. El nuevo `Product` tiene `brandName?: string`. Al migrar productos, tomar `brand.name` y colocarlo en `brandName`.

---

### `cashMovements` → `cashMovements`

**Schema viejo:**
```
{
  wayToPay:       string          // "yape" | "cash" | "transfer" | "bank"
  paymentReason:  { id, name, type("expense"|"income"), isCalculated }
  rode:           number          // negativo = gasto, positivo = ingreso
  description:    string | null
  distributionId: string | null
  uid:            string          // usuario que registró
  bank:           string | null
  timestamp:      Timestamp
  createdAt:      Timestamp
  updatedAt:      Timestamp
}
```

**Schema nuevo** (`CashMovement` en `Finance.ts`):
```
{
  type:           "INCOME" | "EXPENSE"
  categoryId:     string
  categoryName:   string
  amount:         number          // siempre positivo
  description:    string
  paymentMethod:  "CASH" | "TRANSFER" | "CARD" | "OTHER"
  manifestId?:    string
  driverId?:      string
  date:           Date
  createdAt:      Date
  updatedAt:      Date
}
```

**Transformaciones:**

| Campo viejo | Campo nuevo | Regla |
|---|---|---|
| `rode` | `amount` | `Math.abs(rode)` |
| `rode < 0` | `type: "EXPENSE"` | |
| `rode > 0` | `type: "INCOME"` | |
| `paymentReason.id` | `categoryId` | directo |
| `paymentReason.name` | `categoryName` | directo |
| `wayToPay: "yape"` | `paymentMethod: "TRANSFER"` | |
| `wayToPay: "cash"` | `paymentMethod: "CASH"` | |
| `wayToPay: "transfer"` | `paymentMethod: "TRANSFER"` | |
| `wayToPay: "bank"` | `paymentMethod: "TRANSFER"` | |
| `distributionId` | `manifestId` | renombrar |
| `uid` | `driverId` | renombrar |
| `bank` | _(descartar)_ | absorbido por `paymentMethod` |
| `timestamp` | `date` | usar como fecha de la operación |
| `createdAt` (a veces null) | `createdAt` | usar `timestamp` si null |

⚠️ `paymentReason.isCalculated` no tiene equivalente — descartar.

---

### `categoryCustomers` → `tags[]` en `customers`

Colección vieja: `{ name }` — lista de categorías de clientes (ej: "Retail", "Mayorista").

**Decisión:** Migrar como strings en `customers.tags[]`. No crear colección separada.

Durante la migración de `customers`, leer el name de la categoría del viejo proyecto (o buscarlo por id en la colección `categoryCustomers` vieja) y agregarlo a `tags`.

---

### `categoryProducts` → _(deprecar)_

El nuevo `Product` no tiene campo `category`. No migrar.

---

### `counters` → `counters`

El viejo tenía documentos con id `distributions`, `guides`, `invoices` y campo `count`.

El `correlativeService.ts` del nuevo proyecto usa la misma colección con la misma estructura. Verificar los nombres de documento antes de copiar — si el nuevo ya inicializó sus propios contadores, sumar los valores en vez de reemplazar.

**Valores encontrados en viejo:**
- `distributions.count = 615` → mapear a `dispatchManifests` counter
- `guides.count = 201`
- `invoices.count = 100`

---

### `customers` → `customers`

**Schema viejo:**
```
{
  type:           "person" | "company"
  identity:       string          // DNI o RUC (valor "123" en muestras anon.)
  name:           string
  phone:          string
  city:           string
  district:       string | null
  address:        string
  reference:      string | null
  coordenada:     string | null   // URL de Google Maps o null
  debt:           number
  zone:           {}              // objeto vacío — sin uso real
  lastCall:       Timestamp | null
  image:          string | null   // URL de imagen
  category:       { id, name }
  slug:           null            // nunca se llenó
  owner:          null            // nunca se llenó
  licensePlate:   null            // nunca se llenó
  priceReference: string | null
  envases:        { "0": { product: { id, name, brand, waterOutlet }, quantity } }
  totalSale:      number
  lastSale:       Timestamp
  createdAt:      Timestamp
  updatedAt:      Timestamp
}
```

**Schema nuevo** (`Customer` en `Customer.ts`):
```
{
  type:           "INDIVIDUAL" | "COMPANY"
  documentId:     string
  name:           string
  email?:         string
  phone:          string
  tags:           string[]
  locations:      CustomerLocation[]
  contacts:       CustomerContact[]
  debtAmount:     number
  loanedItems:    Record<string, number>   // { [productId]: cantidad }
  customPrices:   Record<string, number>   // { [productId]: precio }
  isActive:       boolean
  createdAt:      Date
  updatedAt:      Date
}
```

**Transformaciones:**

| Campo viejo | Campo nuevo | Regla |
|---|---|---|
| `type: "person"` | `type: "INDIVIDUAL"` | |
| `type: "company"` | `type: "COMPANY"` | |
| `identity` | `documentId` | directo |
| `debt` | `debtAmount` | directo |
| `category.name` | `tags[0]` | tomar el nombre de la categoría |
| `address` + `reference` + `city` + `district` + `coordenada` | `locations[0]` | construir un `CustomerLocation` con `isDefault: true`, `name: "Principal"` |
| `coordenada` (URL Maps) | `locations[0].latitude/longitude` | ⚠️ No parseable directamente desde URL corta — dejar `undefined` o pedir al cliente que confirme |
| `phone` | `contacts[0]` | `{ name: customer.name, phone, role: "Principal" }` |
| `envases["0"]`, `envases["1"]`, ... | `loanedItems` | `{ [product.id]: quantity }` — `envases` es un objeto con claves numéricas como string |
| `priceReference` | `customPrices` | si no null, `{ "referencia": valor }` — ⚠️ campo poco estructurado |
| `isActive` | `isActive: true` | no existía — default `true` para todos |

**Campos viejo sin equivalente (descartar):**
- `zone` — siempre `{}`, sin uso
- `slug` — nunca poblado
- `owner` — nunca poblado
- `licensePlate` — nunca poblado
- `lastCall` — operacional, no parte de la entidad
- `image` — no existe campo en nuevo Customer
- `totalSale` — métrica derivada, no parte de la entidad
- `lastSale` — métrica derivada

---

### `distributions` → `dispatchManifests`

**Schema viejo:**
```
{
  openingDate:  Timestamp
  deadline:     Timestamp | null
  status:       "closed" | "process"
  initialRode:  number | null     // ¿fondo de caja inicial?
  observation:  string | null
  user:         { id, name }
  vehicle:      { id, licensePlate, name }
  uid:          string            // admin que creó el despacho
  createdAt:    null              // nunca se llenó
  updatedAt:    null              // nunca se llenó
  movements:    {                 // objeto con claves numéricas — MEZCLADO
    "0": {
      product:        { id, name, brand, waterOutlet, envase?, type?, isSale?, isSummary? }
      quantity:       number
      quantityCurrent: number
      date:           Timestamp
      dateBatch:      Timestamp
      codeBatch:      string
      description:    string
      // solo en algunos movimientos:
      id?:            string
      isSale?:        boolean
      isChange?:      boolean
      isUseless?:     boolean
      price?:         number
      isDistribution?: boolean
      timestamp?:     Timestamp
      uid?:           string
      quantityBatch?: number
    }
  }
}
```

**Schema nuevo** (`DispatchManifest` en `Dispatch.ts`):
```
{
  manifestNumber:          string    // Ej: DESP-20260510-01
  driverId:                string
  assistantId?:            string
  dispatcherId:            string
  truckPlate:              string
  dispatchDate:            Date
  liquidationDate?:        Date
  status:                  "PENDING" | "ON_ROUTE" | "LIQUIDATED"
  items:                   DispatchItem[]
  returnedEmpties:         DispatchEmptyReturn[]
  initialPettyCash?:       number
  cashExpected:            number
  cashReported:            number
  digitalPaymentsExpected: number
  digitalPaymentsReported: number
  notes?:                  string
  createdAt:               Date
  updatedAt:               Date
}
```

**Transformaciones:**

| Campo viejo | Campo nuevo | Regla |
|---|---|---|
| `user.id` | `driverId` | directo |
| `uid` | `dispatcherId` | el admin que abrió el reparto |
| `vehicle.licensePlate` | `truckPlate` | directo |
| `openingDate` | `dispatchDate` | directo |
| `deadline` | `liquidationDate` | directo si no null |
| `status: "closed"` | `status: "LIQUIDATED"` | |
| `status: "process"` | `status: "ON_ROUTE"` | |
| `observation` | `notes` | directo |
| `initialRode` | `initialPettyCash` | si no null |
| `createdAt: null` | `createdAt` | usar `openingDate` |

**Separación de `movements`:**

El campo `movements` del viejo mezcla tres tipos de eventos:

| Discriminador | Tipo real | Destino nuevo |
|---|---|---|
| `description` contiene "Salida de producto" o tiene `isDistribution: true` | Carga al camión | `items[]` |
| `description` contiene "Devolución de envase" y tiene `quantityCurrent` | Devolución de envase | `returnedEmpties[]` |
| `isUseless: true` | Merma | `KardexLog` (no va en el manifest) |

⚠️ **CAMPOS SIN EQUIVALENTE:** `cashExpected`, `cashReported`, `digitalPaymentsExpected`, `digitalPaymentsReported` no existen en el viejo. Dejar en `0` durante migración.

---

### `movements` → `kardex_logs`

**Schema viejo:**
```
{
  date:           Timestamp
  dateBatch:      Timestamp
  codeBatch:      string          // "DDMMYYYY"
  quantity:       number          // positivo = entrada, negativo = salida
  price:          number
  product:        { id, name, brand, waterOutlet, type?, envase?, isSale?, isSummary? }
  description:    string
  isDistribution: boolean
  timestamp:      Timestamp
  uid:            string | null
  isSale:         boolean
  isChange:       boolean
  isUseless:      boolean
}
```

**Schema nuevo** (`KardexLog` en `Inventory.ts`):
```
{
  productId:      string
  type:           "IN" | "OUT"
  phase:          "EMPTY" | "FILLED"
  quantity:       number          // siempre positivo
  referenceId:    string
  referenceType:  "PRODUCTION" | "SHRINKAGE" | "SALE" | "RETURN" | "PURCHASE"
  previousStock:  number
  newStock:       number
  createdAt:      Date
}
```

**Transformaciones:**

| Campo viejo | Campo nuevo | Regla |
|---|---|---|
| `product.id` | `productId` | directo |
| `quantity > 0` | `type: "IN"` | |
| `quantity < 0` | `type: "OUT"` | |
| `Math.abs(quantity)` | `quantity` | siempre positivo |
| `product.type === "envase"` | `phase: "EMPTY"` | |
| `product.type === "product"` | `phase: "FILLED"` | |
| `isSale && !isDistribution` | `referenceType: "SALE"` | |
| `isDistribution` | `referenceType: "SALE"` | venta en ruta |
| `isUseless` | `referenceType: "SHRINKAGE"` | |
| `isChange` | `referenceType: "RETURN"` | |
| `codeBatch` | `referenceId` | lote de referencia |
| `timestamp` | `createdAt` | |

⚠️ `previousStock` y `newStock` **no existen** en los datos viejos. No se puede reconstruir sin reproducir la secuencia completa. Dejar en `0` o `null` en migración inicial — aceptar que el historial importado no tendrá saldos anteriores.

---

### `paymentReasons` → `finance_categories`

**Schema viejo:** `{ name, type("expense"), isCalculated: boolean }`

**Schema nuevo** (`FinanceCategory` en `Finance.ts`):
```
{
  name:       string
  type:       "INCOME" | "EXPENSE"
  isActive:   boolean
  createdAt:  Date
}
```

**Transformaciones:**

| Campo viejo | Campo nuevo | Regla |
|---|---|---|
| `name` | `name` | directo |
| `type: "expense"` | `type: "EXPENSE"` | uppercase |
| `type: "income"` | `type: "INCOME"` | uppercase (si existe) |
| `isCalculated` | _(descartar)_ | sin equivalente |
| _(no existía)_ | `isActive: true` | default |
| _(no existía)_ | `createdAt` | `serverTimestamp()` |

---

### `products` → `products`

**Schema viejo:**
```
{
  name:                  string
  type:                  "product" | "envase"
  waterOutlet:           "normal" | "spout" | "other"
  brand:                 { id, name }
  envase:                { id, name, waterOutlet, brand } | null  // el envase asociado (solo type=product)
  category:              { id, name }
  active:                boolean
  isSale:                boolean
  isSummary:             boolean
  isReturnable:          boolean | null
  distribution:          boolean
  imageUrl:              string | null
  cost:                  number | null
  stock:                 number
  newDeliveryPrice:      number    // precio lleno, entrega a domicilio
  newPlantPrice:         number    // precio lleno, retira en planta
  rechargeDeliveryPrice: number    // precio recarga, entrega a domicilio
  rechargePlantPrice:    number    // precio recarga, retira en planta
}
```

**Schema nuevo** (`Product` en `Inventory.ts`):
```
{
  name:                  string
  sku:                   string
  operationalCategory:   "FULL_PRODUCT" | "EMPTY_CONTAINER" | "ACCESSORY"
  packagingType:         string
  isMaquila:             boolean
  brandName?:            string
  volumeCapacity:        number
  unitOfMeasure:         "L" | "ml" | "Gal" | "Oz"
  hasTap:                boolean
  isReturnableContainer: boolean
  priceRefill:           number
  priceFull:             number
  priceEmpty:            number
  stockFilled:           number
  stockEmpty:            number
  isActive:              boolean
  createdAt:             Date
  updatedAt:             Date
}
```

**Transformaciones:**

| Campo viejo | Campo nuevo | Regla |
|---|---|---|
| `type: "product"` | `operationalCategory: "FULL_PRODUCT"` | |
| `type: "envase"` | `operationalCategory: "EMPTY_CONTAINER"` | |
| `active` | `isActive` | directo |
| `brand.name` | `brandName` | directo |
| `waterOutlet: "spout"` | `hasTap: true` | |
| `waterOutlet: "normal"/"other"` | `hasTap: false` | |
| `isReturnable` | `isReturnableContainer` | directo (null → false) |
| `stock` (si type=product) | `stockFilled` | |
| `stock` (si type=envase) | `stockEmpty` | |
| `rechargePlantPrice` | `priceRefill` | precio de recarga (planta como referencia) |
| `newPlantPrice` | `priceFull` | precio lleno (planta como referencia) |
| `rechargeDeliveryPrice` | _(descartar o nota)_ | el nuevo solo tiene un `priceRefill` |
| `newDeliveryPrice` | _(descartar o nota)_ | el nuevo solo tiene un `priceFull` |
| `cost` | _(descartar)_ | sin equivalente en nuevo esquema |

**Campos nuevos sin dato viejo (requieren valor por defecto):**

| Campo nuevo | Default sugerido |
|---|---|
| `sku` | Generar: `type.toUpperCase()[0] + "-" + waterOutlet[0].toUpperCase() + "-" + doc.id.slice(0,4)` |
| `packagingType` | `"BIDON_20L"` como placeholder (revisar manualmente) |
| `volumeCapacity` | `20` (todos parecen ser bidones de 20L) |
| `unitOfMeasure` | `"L"` |
| `isMaquila` | `false` |
| `priceEmpty` | `0` (no existía el concepto de venta de envase vacío) |

⚠️ **DECISIÓN PENDIENTE:** El viejo tenía 4 precios (planta/delivery × lleno/recarga). El nuevo tiene 3 (`priceFull`, `priceRefill`, `priceEmpty`). Hay que confirmar con el negocio cuál precio "gana" — la propuesta arriba usa precio de planta.

---

### `uselessReasons` → `shrinkage_reasons` _(nueva colección)_

**Schema viejo:** `{ name, type("product"|"envase"), createdAt, updatedAt, id }`

El nuevo `ShrinkageLog.reasonId` referencia una colección de motivos de merma que aún no existe en el nuevo proyecto.

**Acción:** Crear colección `shrinkage_reasons` con estructura:
```
{
  name:        string
  affectsPhase: "FILLED" | "EMPTY"   // "product" → "FILLED", "envase" → "EMPTY"
  isActive:    boolean
  createdAt:   Date
}
```

---

### `users` → `users`

**Schema viejo:** `{ name, active, email, role("distributor"), isBusy }`

**Schema nuevo** (`User` en `User.ts`):
```
{
  name:           string
  email:          string
  roles:          UserRole[]    // ["ADMIN"|"PRODUCTION"|"SALES"|"DRIVER"|"ASSISTANT"]
  licenseNumber?: string
  documentNumber?: string
  truckId?:       string
  isActive:       boolean
  createdAt:      Date
  updatedAt:      Date
}
```

**Transformaciones:**

| Campo viejo | Campo nuevo | Regla |
|---|---|---|
| `active` | `isActive` | directo |
| `role: "distributor"` | `roles: ["DRIVER"]` | mapear — todos los usuarios viejos eran distribuidores |
| `isBusy` | _(descartar)_ | estado operacional, no parte de la entidad |
| _(no existía)_ | `createdAt` | `serverTimestamp()` |
| _(no existía)_ | `updatedAt` | `serverTimestamp()` |

⚠️ Verificar manualmente si algún usuario viejo era admin — en el viejo no hay rol "admin" en la muestra (todos son "distributor").

---

### `vehicles` → `trucks`

**Schema viejo:** `{ name, licensePlate, isBusy }`

**Schema nuevo** (`Truck` en `Truck.ts`):
```
{
  plateNumber: string
  alias:       string
  capacity:    number
  isActive:    boolean
  createdAt:   Date
  updatedAt:   Date
}
```

**Transformaciones:**

| Campo viejo | Campo nuevo | Regla |
|---|---|---|
| `licensePlate` | `plateNumber` | directo |
| `name` | `alias` | directo |
| `isBusy` | _(descartar)_ | estado operacional |
| _(no existía)_ | `capacity` | `0` como placeholder — revisar manualmente |
| _(no existía)_ | `isActive: true` | default |

---

### `vouchers` → `sales`

La colección `sales` en el nuevo proyecto existe (ver `salesRepository.ts`) pero no hay entidad de dominio documentada en `core/entities/`. Basado en los datos del viejo:

**Schema viejo:**
```
{
  date:             Timestamp
  createdAt:        null          // nunca poblado
  updatedAt:        null          // nunca poblado
  updateAt:         Timestamp     // typo del campo — es el updatedAt real
  customer:         { id, name, phone, coordenada, reference, image, category }
  origin:           string        // ID del distribution (reparto de origen)
  address:          string        // dirección de entrega
  reference:        string | null
  totalPaid:        number | null
  total:            number
  observation:      string | null
  uid:              string        // usuario que creó
  totalDrumsNormal: number
  totalDrumsSpout:  number
  totalDrumsOther:  number
  movements:        { "0": { product, quantity, price, isSale, dateBatch, codeBatch, id, date, description } }
  envases:          { "0": { product, quantity, quantityCurrent, date, dateBatch, codeBatch, description } }
  id:               string        // duplicado del docId
  type:             "sale"
  paymentType:      "credit" | "cash"
  status:           "sold"
  debtPaid:         number
  isPaid:           boolean
  dateProcess:      Timestamp     // fecha de procesamiento/cobro
}
```

**Transformaciones clave:**

| Campo viejo | Campo nuevo | Regla |
|---|---|---|
| `customer.id` | `customerId` | directo |
| `origin` | `manifestId` | el ID del distribution = el ID del manifest nuevo |
| `date` | `date` | directo |
| `updateAt` | `updatedAt` | corrección del typo |
| `total` | `totalAmount` | directo |
| `totalPaid` | `paidAmount` | directo |
| `isPaid` | `isPaid` | directo |
| `paymentType: "cash"` | `paymentMethod: "CASH"` | |
| `paymentType: "credit"` | `paymentMethod: "CREDIT"` | |
| `uid` | `createdBy` | directo |
| `movements["0"], ["1"]...` | `items[]` | convertir objeto-keyed a array |
| `envases["0"]...` | `returnedContainers[]` | envases devueltos por el cliente |
| `totalDrumsNormal/Spout/Other` | _(descartar)_ | derivable de `items[]` |
| `type: "sale"` | _(descartar)_ | toda la colección es ventas |
| `status: "sold"` | `status: "DELIVERED"` | mapear |

---

## Advertencias globales

1. **`movements` y `envases` son objetos con claves numéricas**, no arrays. El script de migración debe hacer `Object.values(doc.movements)` para iterar.

2. **`createdAt: null` en distributions y vouchers** — usar el campo de fecha más próximo (`openingDate` o `date`) como sustituto.

3. **`coordenada` en customers** es una URL corta de Google Maps. No se puede convertir a lat/lng sin llamar a la API de Maps. Guardar como `locationUrl` en `notes` o dejar coordenadas vacías.

4. **IDs numéricos en vouchers y distributions** (`"1"`, `"10"`, `"1000"`) — el nuevo sistema usa Firestore auto-IDs. Guardar el ID viejo en un campo `legacyId` para trazabilidad.

5. **Precio en los `movements` de vouchers es negativo** (`quantity: -3`) — representa salidas. El script debe `Math.abs()`.

6. **`envases.brand` a veces tiene tipo "object"** en el inspector (depth limit alcanzado) — el schema real es `{ id, name }`.
