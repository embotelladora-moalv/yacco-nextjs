# Capítulo VI: Verificación y Validación

## 6.1 Testing Suites & Validation

La estrategia de pruebas de Yacco ERP se basa en la pirámide de automatización, priorizando las pruebas unitarias de lógica de negocio y los generadores XML de SUNAT para garantizar la integridad tributaria.

### 6.1.1 Core Entities Unit Tests
A continuación, se presenta el diseño de las pruebas unitarias para las entidades del dominio. La implementación técnica de estas pruebas está vinculada a las historias **US-301** y **US-302**.

| Entidad | Caso de Prueba | Input | Resultado Esperado |
| :--- | :--- | :--- | :--- |
| **Customer** | Validación de RUC inválido. | `documentNumber: "123"` | Error de validación (Zod/Entity). |
| **Order** | Cálculo de saldo de envases al crear pedido. | 10 bidones entregados, 2 devueltos. | Saldo acumulado: +8 envases. |
| **Sale** | Cálculo de totales e IGV (18%). | Subtotal: 100.00 | Total: 118.00, IGV: 18.00. |
| **SunatDocument** | Determinación de serie por tipo. | `type: "01"` (Factura) | Serie inicia con "F" (ej. F001). |

**Ejemplo ilustrativo de test (Vitest):**
```ts
// src/core/entities/__tests__/Sale.test.ts
// [PLACEHOLDER: Implementación real vinculada a US-302]
test('debe calcular el IGV correctamente', () => {
  const sale = { items: [{ qty: 1, price: 100 }] };
  expect(calculateTotals(sale).igv).toBe(18);
});
```

### 6.1.2 Core Integration Tests
Se han diseñado pruebas de integración para validar la comunicación entre el dominio y la infraestructura (Firebase/SUNAT).

*   **Flujo de Emisión de Comprobante:** Valida que el `EmitirComprobanteUseCase` coordine correctamente el repositorio de ventas, el generador XML, el firmador digital y el cliente SOAP de SUNAT.
*   **Registro de Venta en Ruta:** Valida la atomicidad de la transacción (creación de venta, actualización de deuda del cliente y descuento de stock en el camión).

**Evidencia de ejecución:**
[EVIDENCIA PLACEHOLDER: Reporte de cobertura de Vitest y logs de integración con Firebase Emulator]

### 6.1.3 Behavior-Driven Development (BDD)
Se definen escenarios en formato Gherkin para validar el comportamiento del sistema desde la perspectiva del usuario.

**Feature: Facturación de Ventas Consolidadas**
*   **Scenario:** Emitir una factura para múltiples ventas del mismo cliente.
    *   **Given** que el administrador ha seleccionado tres ventas completadas del cliente "Agua Pura S.A.".
    *   **When** el administrador presiona el botón "Emitir Factura".
    *   **Then** el sistema debe generar un único documento XML UBL 2.1 con el detalle de las tres ventas y recibir el CDR de aceptación de SUNAT.

**Feature: Emisión de Guía de Remisión (GRE)**
*   **Scenario:** Generación automática de GRE al asignar ruta.
    *   **Given** un manifiesto de despacho con estado "PENDING".
    *   **When** el administrador asigna un chofer y un camión al manifiesto.
    *   **Then** el worker de background debe emitir la GRE a la API REST de SUNAT y generar el PDF con código QR.

### 6.1.4 System Tests
Pruebas de extremo a extremo (E2E) que simulan el uso real por roles:

*   **Rol Administrador:** Login -> Carga de stock -> Armado de ruta -> Emisión de Factura -> Cierre de caja.
*   **Rol Chofer:** Ver ruta asignada -> Registrar entrega de 5 bidones -> Recoger 3 envases vacíos -> Finalizar ruta.

**Evidencia de ejecución:**
[EVIDENCIA PLACEHOLDER: Video o capturas de flujo completo en entorno de Staging]

---

## 6.2 Static Testing & Verification

### 6.2.1 Static Code Analysis

#### 6.2.1.1 Coding standard & conventions
El proyecto utiliza **ESLint** con la configuración oficial de Next.js (`eslint-config-next`), complementada con las reglas de estilo definidas en `CONTRIBUTING.md`. El tipado estricto es forzado mediante el compilador de TypeScript (`tsc`).

#### 6.2.1.2 Code Quality & Security
Se han establecido las siguientes métricas y herramientas de verificación:
*   **Tooling:** ESLint para linting, `tsc --noEmit` para verificación de tipos, y **gitleaks** para prevención de fuga de credenciales.
*   **Métricas Objetivo:** 0 errores de lint, 0 warnings de tipo en ramas `main` y `develop`.
*   **Deuda Técnica Detectada:** Se han vinculado los hallazgos de la auditoría inicial (`docs/REVISION-CODIGO.md`) como puntos de mejora obligatorios, tales como la eliminación de usos de `any` (BUG-06) y la protección de logs sensibles (BUG-11).

**Resultados del Análisis Estático:**
[EVIDENCIA PLACEHOLDER: Captura de pantalla de la ejecución de `npm run lint` sin errores]

### 6.2.2 Reviews
El proceso de verificación por pares (Peer Review) es obligatorio para cualquier cambio en la lógica de negocio. Se utiliza el checklist definido en `CONTRIBUTING.md` §11, enfocándose en:
*   Cumplimiento de la arquitectura limpia (Casos de Uso aislados).
*   Correcto manejo de errores de SUNAT.
*   Ausencia de datos sensibles en el código.

---

## 6.3 Validation Interviews

### 6.3.1 Diseño de entrevista de verificación y validación (V&V)
Objetivo: Validar la confiabilidad y calidad técnica percibida por los usuarios expertos.

1. ¿Considera que el proceso de firma digital y envío a SUNAT es transparente y confiable?
2. ¿Qué tan rápido puede identificar si un documento fue rechazado por SUNAT y el motivo del error?
3. ¿Ha notado alguna inconsistencia entre los datos registrados en la venta y los que figuran en el comprobante electrónico?
4. ¿El sistema previene correctamente la emisión de guías si faltan datos críticos como el peso o el ubigeo?
5. ¿Qué tan seguro se siente respecto a la privacidad de los tokens y certificados manejados por el sistema?
6. ¿El flujo de "Liquidación de Caja" le da la seguridad de que no hay pérdida de dinero o envases?

### 6.3.2 Registro de entrevistas
| Entrevistador | Usuario / Rol | Fecha | Hallazgo Clave |
| :--- | :--- | :--- | :--- |
| [PLACEHOLDER 29] | [PLACEHOLDER 30] | [PLACEHOLDER 31] | [PLACEHOLDER 32] |

### 6.3.3 Evaluación de Heurísticas de Nielsen (Final)
[Plantilla de evaluación consolidada tras las pruebas de validación final].

| Heurística | Hallazgo Detectado | Severidad | Acción de Mejora |
| :--- | :--- | :---: | :--- |
| H1: Visibilidad | [PLACEHOLDER] | - | - |
| H2: Mundo real | [PLACEHOLDER] | - | - |
| ... | ... | - | - |

---

## 6.4 Auditoría de Experiencias de Usuario

### 6.4.1 Auditoría realizada (Por el equipo Yacco)
Documentación de la auditoría externa realizada a otro grupo del curso.

*   **Info del grupo auditado:** [PLACEHOLDER 33: Nombre del proyecto y grupo]
*   **Cronograma:** [PLACEHOLDER 34: Fechas de la auditoría]
*   **Contenido:** [PLACEHOLDER 35: Resumen de hallazgos encontrados en el proyecto auditado]

### 6.4.2 Auditoría recibida (A Yacco ERP)
Documentación de los resultados y mejoras aplicadas tras recibir una auditoría externa.

*   **Info del grupo auditor:** [PLACEHOLDER 36: Nombre del grupo auditor]
*   **Cronograma:** [PLACEHOLDER 37]
*   **Hallazgos Principales:** [PLACEHOLDER 38: Lista de bugs o mejoras UI sugeridas]
*   **Resumen de modificaciones:** [PLACEHOLDER 39: Cambios realizados en el código o documentación tras la auditoría]
