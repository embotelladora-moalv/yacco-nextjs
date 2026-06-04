# Reporte de Verificación de Migración

**Fecha:** 2026-06-04 04:19:01  
**Proyecto viejo:** `moalv-ac994`  
**Proyecto nuevo:** `nuevo`  
**Tiempo de ejecución:** 297.4s

## Veredicto

⚠️ REVISAR — Hay hallazgos menores que requieren revisión manual.

---

## §1 Conteos (viejo vs nuevo)

| Entidad | Colección vieja | Colección nueva | #Viejo | #Nuevo | Diff | ¿Match? |
|---|---|---|---:|---:|---:|:---:|
| paymentReasons | `paymentReasons` | `finance_categories` | 25 | 25 | +0 | ✅ |
| uselessReasons | `uselessReasons` | `shrinkage_reasons` | 2 | 2 | +0 | ✅ |
| users | `users` | `users` | 9 | 9 | +0 | ✅ |
| vehicles | `vehicles` | `trucks` | 4 | 4 | +0 | ✅ |
| products | `products` | `products` | 27 | 27 | +0 | ✅ |
| customers | `customers` | `customers` | 604 | 604 | +0 | ✅ |
| cashMovements | `cashMovements` | `cashMovements` | 1657 | 1657 | +0 | ✅ |
| distributions | `distributions` | `dispatchManifests` | 595 | 595 | +0 | ✅ |
| movements | `movements` | `kardex_logs` | 9857 | 9857 | +0 | ✅ |
| vouchers | `vouchers` | `sales` | 8433 | 8433 | +0 | ✅ |
| **TOTAL** | | | **21213** | **21213** | **+0** | ✅ |

## §2 Integridad referencial

✅ Sin huérfanos detectados.

## §3 Campos críticos

⚠️ Se encontraron 369 registros con campos problemáticos.

### customers: documentId vacío/placeholder '123'
- **Total:** 367
- **Ejemplos:**
  - `021he0pUt150nfJ67RhJ`
  - `0Iy1S1svL6FNRK1rAaRZ`
  - `0O8yIf1zN4cldkKEAyeJ`
  - `0RtIwdWwM1PviNjrMv7y`
  - `0TpSYheSyHuHSzdhB42Q`
  - `0tue2SggWZzXdCkqYy4m`
  - `0xh4GrRBiNQ668zqWDHD`
  - `13Gk7FVnngnqLvFmGCRj`
  - `194J3uX6c1wR7oQdw3rf`
  - `1AcHTDlz8Ma59B5AILOG`

### customers: debtAmount nulo/NaN/negativo
- **Total:** 2
- **Ejemplos:**
  - `customer/IzTQVszyM5R0KGdSBERE debtAmount=-1.4210854715202004e-14`
  - `customer/YJqc3hc68Fu8zgK7kdRD debtAmount=-8.881784197001252e-16`

## §4 Tipos y fechas

✅ Todos los tipos son correctos en la muestra verificada.

## §5 Spot-check: 5 clientes (PII anonimizado)

```json
[
  {
    "id": "021he0pUt150nfJ67RhJ",
    "type": "INDIVIDUAL",
    "documentId": "***",
    "name": "***",
    "phone": "***",
    "tags": [
      "PARQUE"
    ],
    "locations": [
      {
        "id": "loc-021he0pUt150nfJ67RhJ",
        "name": "Principal",
        "address": "sd",
        "isDefault": true
      }
    ],
    "contacts": [
      {
        "id": "contact-021he0pUt150nfJ67RhJ",
        "name": "ROMULO X VENECA",
        "phone": "123",
        "role": "Principal"
      }
    ],
    "debtAmount": 0,
    "loanedItems": {
      "pQCC0swbVAm26upsC2qp": 1
    },
    "customPrices": {},
    "isActive": true,
    "legacyId": "021he0pUt150nfJ67RhJ",
    "legacyCategoryId": "ISP0kfzTFvIfFPioJumR",
    "createdAt": {
      "_seconds": 1766416255,
      "_nanoseconds": 453000000
    },
    "updatedAt": {
      "_seconds": 1766416255,
      "_nanoseconds": 453000000
    }
  },
  {
    "id": "0Iy1S1svL6FNRK1rAaRZ",
    "type": "INDIVIDUAL",
    "documentId": "***",
    "name": "***",
    "phone": "***",
    "tags": [
      "PARQUE"
    ],
    "locations": [
      {
        "id": "loc-0Iy1S1svL6FNRK1rAaRZ",
        "name": "Principal",
        "address": "sd",
        "isDefault": true,
        "locationUrl": "https://maps.app.goo.gl/eFammhSzvQWU9bS29"
      }
    ],
    "contacts": [
      {
        "id": "contact-0Iy1S1svL6FNRK1rAaRZ",
        "name": "Dayana Ex Grupo Francisco",
        "phone": "947490443",
        "role": "Principal"
      }
    ],
    "debtAmount": 0,
    "loanedItems": {
      "pQCC0swbVAm26upsC2qp": 5
    },
    "customPrices": {},
    "isActive": true,
    "legacyId": "0Iy1S1svL6FNRK1rAaRZ",
    "legacyCategoryId": "ISP0kfzTFvIfFPioJumR",
    "createdAt": {
      "_seconds": 1759244239,
      "_nanoseconds": 802000000
    },
    "updatedAt": {
      "_seconds": 1759244239,
      "_nanoseconds": 802000000
    }
  },
  {
    "id": "0O8yIf1zN4cldkKEAyeJ",
    "type": "INDIVIDUAL",
    "documentId": "***",
    "name": "***",
    "phone": "***",
    "tags": [
      "PARQUE"
    ],
    "locations": [
      {
        "id": "loc-0O8yIf1zN4cldkKEAyeJ",
        "name": "Principal",
        "address": "SD",
        "isDefault": true,
        "locationUrl": "https://maps.app.goo.gl/TRXNZmP384e11sWk7"
      }
    ],
    "contacts": [
      {
        "id": "contact-0O8yIf1zN4cldkKEAyeJ",
        "name": "ALEJANDRA HERMANA BEATRIZ - LOCAL",
        "phone": "910193385",
        "role": "Principal"
      }
    ],
    "debtAmount": 0,
    "loanedItems": {
      "pQCC0swbVAm26upsC2qp": 1
    },
    "customPrices": {},
    "isActive": true,
    "legacyId": "0O8yIf1zN4cldkKEAyeJ",
    "legacyCategoryId": "ISP0kfzTFvIfFPioJumR",
    "createdAt": {
      "_seconds": 1774473278,
      "_nanoseconds": 286000000
    },
    "updatedAt": {
      "_seconds": 1774473278,
      "_nanoseconds": 286000000
    }
  },
  {
    "id": "0RtIwdWwM1PviNjrMv7y",
    "type": "INDIVIDUAL",
    "documentId": "***",
    "name": "***",
    "phone": "***",
    "tags": [
      "PARQUE"
    ],
    "locations": [
      {
        "id": "loc-0RtIwdWwM1PviNjrMv7y",
        "name": "Principal",
        "address": "S/D",
        "isDefault": true,
        "locationUrl": "https://maps.app.goo.gl/dYYvGdr3sDXenVy1A"
      }
    ],
    "contacts": [
      {
        "id": "contact-0RtIwdWwM1PviNjrMv7y",
        "name": "HERMES",
        "phone": "912465859",
        "role": "Principal"
      }
    ],
    "debtAmount": 0,
    "loanedItems": {
      "pQCC0swbVAm26upsC2qp": 2
    },
    "customPrices": {},
    "isActive": true,
    "legacyId": "0RtIwdWwM1PviNjrMv7y",
    "legacyCategoryId": "ISP0kfzTFvIfFPioJumR",
    "createdAt": {
      "_seconds": 1714685572,
      "_nanoseconds": 797000000
    },
    "updatedAt": {
      "_seconds": 1714685572,
      "_nanoseconds": 797000000
    }
  },
  {
    "id": "0TpSYheSyHuHSzdhB42Q",
    "type": "INDIVIDUAL",
    "documentId": "***",
    "name": "***",
    "phone": "***",
    "tags": [
      "PARQUE"
    ],
    "locations": [
      {
        "id": "loc-0TpSYheSyHuHSzdhB42Q",
        "name": "Principal",
        "address": "S/D",
        "isDefault": true,
        "locationUrl": "https://maps.app.goo.gl/BgrJiv7rMnCSHkNK8"
      }
    ],
    "contacts": [
      {
        "id": "contact-0TpSYheSyHuHSzdhB42Q",
        "name": "MARVIN",
        "phone": "123",
        "role": "Principal"
      }
    ],
    "debtAmount": 0,
    "loanedItems": {
      "pQCC0swbVAm26upsC2qp": 1
    },
    "customPrices": {},
    "isActive": true,
    "legacyId": "0TpSYheSyHuHSzdhB42Q",
    "legacyCategoryId": "ISP0kfzTFvIfFPioJumR",
    "createdAt": {
      "_seconds": 1714685572,
      "_nanoseconds": 825000000
    },
    "updatedAt": {
      "_seconds": 1720220797,
      "_nanoseconds": 927000000
    }
  }
]
```

---
_Generado automáticamente por `scripts/migration/verify-migration.ts`_