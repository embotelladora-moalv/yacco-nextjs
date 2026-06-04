# Capítulo III: Especificación de Requerimientos

## 3.1 To-Be Scenario Mapping

A diferencia de la gestión manual documentada en el "As-is", la implementación de Yacco ERP transforma el flujo de valor mediante la automatización y centralización de datos.

### Escenario A: Emisión masiva de comprobantes (Administrador)
*   **Fase 1: Preparación.** Al finalizar el día, el administrador (Gerardo) accede al panel de facturación donde el sistema ya ha consolidado todas las ventas con estado "No facturado".
*   **Fase 2: Acción.** Selecciona múltiples ventas de un mismo cliente (ej. corporativo) y hace clic en "Emitir Comprobante".
*   **Fase 3: Ejecución del Sistema.** El ERP (mediante su arquitectura limpia) agrupa los productos, calcula el IGV, genera el XML en estándar UBL 2.1, lo firma digitalmente y lo envía a la API SOAP de SUNAT en menos de 3 segundos.
*   **Mejora vs As-is:** Reducción del tiempo de emisión de horas a segundos. Eliminación del 100% de errores de tipeo o cálculos manuales de impuestos.

### Escenario B: Despacho automatizado con GRE (Chofer)
*   **Fase 1: Preparación.** El administrador arma la ruta en el sistema y asigna los pedidos a un camión (Manifiesto).
*   **Fase 2: Ejecución del Sistema (Background).** Un *worker* en Cloud Functions detecta la asignación y, de manera asíncrona, genera la Guía de Remisión Remitente (GRE), la envía a la API REST de SUNAT y guarda el ticket.
*   **Fase 3: Acción.** El chofer (Raúl) abre su aplicación web en la tablet antes de salir de la planta y ya tiene el PDF de la GRE válida con su código QR.
*   **Mejora vs As-is:** Garantiza el cumplimiento legal antes de que el camión encienda el motor, previniendo decomisos y agilizando la salida de planta.

---

## 3.2 User Stories

Las historias de usuario han sido derivadas del backlog técnico y estructuradas bajo el formato académico estándar.

### Épica E-01: Estabilización y seguridad
| ID | Historia de Usuario | Criterios de Aceptación (Resumen) |
| :--- | :--- | :--- |
| **US-002** | **Como** facturador, **quiero** que las guías se emitan con la fecha del día actual, **para** que SUNAT las acepte correctamente. | Fecha dinámica asignada (no hardcodeada al 2026). Test unitario pasa. |
| **US-003** | **Como** administrador de sistemas, **quiero** que el endpoint de carga inicial de datos (seed) esté protegido, **para** evitar inserciones maliciosas en producción. | 404 en producción, 401 si falta token `x-seed-token` en desarrollo. |
| **US-004** | **Como** desarrollador, **quiero** configurar la URL de SUNAT mediante variables de entorno, **para** transicionar de Beta a Producción sin alterar el código fuente. | Variable `SUNAT_BILL_SERVICE_URL` implementada en archivos de API. |
| **US-005** | **Como** auditor de seguridad, **quiero** eliminar el registro en consola de credenciales y payloads XML, **para** prevenir la fuga de información sensible (tokens/certificados). | Logs de tokens eliminados en producción. Logger estructurado en uso. |

### Épica E-02: Refactor a Clean Architecture
| ID | Historia de Usuario | Criterios de Aceptación (Resumen) |
| :--- | :--- | :--- |
| **US-101** | **Como** arquitecto de software, **quiero** definir interfaces para los repositorios de datos, **para** desacoplar la lógica de dominio de Firebase y permitir el testing con mocks. | Interfaces creadas en `core/use-cases/`. |
| **US-102** | **Como** desarrollador, **quiero** extraer la emisión de comprobantes a un `EmitirComprobanteUseCase`, **para** mantener la lógica de negocio aislada y testeable. | Lógica movida a UseCase. Server Action solo actúa como wrapper. |
| **US-103** | **Como** desarrollador, **quiero** extraer la anulación de comprobantes a un `AnularComprobanteUseCase`, **para** mantener cohesión arquitectónica. | UseCase de anulación implementado y conectado a la UI. |
| **US-104** | **Como** desarrollador, **quiero** extraer la emisión de guías a un `EmitirGuiaRemisionUseCase`, **para** aislar la lógica de cálculo de pesos y envío REST. | UseCase de GRE implementado. |
| **US-105** | **Como** ingeniero de software, **quiero** unificar la entidad `CustomerLocation`, **para** evitar inconsistencias de datos entre los módulos de CRM y Despacho. | Una sola interfaz. Consumidores actualizados. |
| **US-106** | **Como** líder técnico, **quiero** eliminar el tipado dinámico (`any`) en la capa de persistencia, **para** aprovechar la seguridad en tiempo de compilación de TypeScript. | `serializeDoc<T>` implementado. Cero `as any` en repositorios. |
| **US-107** | **Como** desarrollador, **quiero** centralizar el cálculo de impuestos en un `IgvCalculator`, **para** garantizar la consistencia tributaria en todo el sistema. | Domain service creado y aplicado globalmente. |

### Épica E-03: Worker SUNAT real
| ID | Historia de Usuario | Criterios de Aceptación (Resumen) |
| :--- | :--- | :--- |
| **US-201** | **Como** ingeniero DevOps, **quiero** compartir la lógica de SUNAT mediante un *npm workspace*, **para** que las Cloud Functions y Next.js utilicen el mismo código fuente. | Paquete compartido `sunat-core` configurado y compilando en ambos entornos. |
| **US-202** | **Como** despachador, **quiero** que la asignación de pedidos genere Guías de Remisión reales automáticamente en background, **para** operar dentro del marco legal tributario. | Worker consume cola de eventos y emite a SUNAT REST. |
| **US-203** | **Como** sistema, **necesito** realizar polling a SUNAT sobre los tickets GRE pendientes, **para** confirmar la aceptación final del documento de traslado. | Función programada cada 5 min. Actualiza estado a ACCEPTED/REJECTED. |
| **US-204** | **Como** sistema, **necesito** implementar reintentos con *backoff* exponencial en caso de timeout, **para** garantizar la emisión a pesar de inestabilidades en la red de SUNAT. | Worker reintenta fallas 5xx hasta 3 veces. |

### Épica E-04: Calidad y testing
| ID | Historia de Usuario | Criterios de Aceptación (Resumen) |
| :--- | :--- | :--- |
| **US-301** | **Como** QA, **quiero** configurar un entorno de pruebas unitarias (Vitest), **para** validar la lógica de negocio automáticamente. | Vitest operativo. Comando `npm test` funcional. |
| **US-302** | **Como** QA, **quiero** pruebas automatizadas para el generador XML, **para** asegurar que los documentos siempre cumplan el estándar UBL 2.1. | Cobertura de tests validando estructura XML. |
| **US-303** | **Como** equipo de desarrollo, **quiero** un pipeline CI/CD básico, **para** asegurar que el código nuevo no rompa las funcionalidades existentes antes de desplegar. | GitHub Actions configurado (lint, test, build). |
| **US-304** | **Como** analista de soporte, **quiero** logs estructurados, **para** facilitar el diagnóstico de errores en producción sin comprometer datos. | Reemplazo de `console.log` por logger formal. |

### Épica E-05: Reportes y BI
| ID | Historia de Usuario | Criterios de Aceptación (Resumen) |
| :--- | :--- | :--- |
| **US-401** | **Como** gerente, **quiero** un dashboard con indicadores en tiempo real, **para** monitorear las ventas y el desempeño de la empresa. | Gráficos de ventas diarias y top clientes. |
| **US-402** | **Como** equipo de finanzas, **quiero** un reporte de cobranzas consolidado, **para** gestionar la cartera de créditos y reducir la morosidad. | Reporte exportable a Excel con antigüedad de deuda. |
| **US-403** | **Como** contador, **quiero** descargar un reporte de operaciones validadas por SUNAT, **para** agilizar el cierre contable mensual. | Filtros por estado, descarga masiva de XML/PDF. |

### Épica E-06: App móvil para choferes
| ID | Historia de Usuario | Criterios de Aceptación (Resumen) |
| :--- | :--- | :--- |
| **US-501** | **Como** chofer, **quiero** una interfaz optimizada para móviles, **para** poder ver mi ruta y registrar entregas desde mi celular. | Interfaz PWA/App con geolocalización y modo offline básico. |

### Épica E-07: Integraciones futuras
| ID | Historia de Usuario | Criterios de Aceptación (Resumen) |
| :--- | :--- | :--- |
| **US-601** | **Como** cobrador, **quiero** generar códigos QR de Yape/Plin directamente desde el sistema, **para** conciliar los pagos digitales automáticamente. | Integración con pasarela de pagos. |
| **US-602** | **Como** gerente de planta, **quiero** proyecciones de demanda basadas en IA, **para** optimizar la producción semanal de agua purificada. | Módulo predictivo alimentado por historial de ventas. |
| **US-603** | **Como** jefe de producción, **quiero** integración IoT con las balanzas, **para** que el inventario de stock se actualice sin intervención humana. | API consumiendo datos de sensores en planta. |

---

## 3.3 Impact Mapping

*   **Objetivo Central (Goal):** Digitalizar la operación logística y asegurar el 100% de cumplimiento tributario automatizado ante SUNAT.
    *   **Actor:** Administrador / Gerente de Planta
        *   *Impacto:* Eliminar el re-trabajo contable y descuadres de caja.
            *   *Entregable:* Panel de Consolidación de Ventas y Liquidación de Ruta.
            *   *Entregable:* Emisión masiva de comprobantes electrónicos con un solo clic.
    *   **Actor:** Chofer / Repartidor
        *   *Impacto:* Acelerar la salida de planta y reducir el estrés administrativo en campo.
            *   *Entregable:* Interfaz móvil para registro rápido de entrega y retorno de envases vacíos.
            *   *Entregable:* Generación y disponibilidad automática de GRE en PDF en su dispositivo.
    *   **Actor:** SUNAT (Actor Sistémico)
        *   *Impacto:* Recepción transparente y validada de operaciones en los plazos de ley.
            *   *Entregable:* Generador UBL 2.1 con validación estricta de esquemas XML.
            *   *Entregable:* Worker con backoff exponencial para garantizar entrega de tickets ante caídas del servidor gubernamental.

---

## 3.4 Product Backlog (Resumen de Esfuerzo)

> **Nota:** La definición técnica, estado actual e historial de las historias de usuario se mantiene en la fuente de verdad operativa del proyecto: `docs/BACKLOG.md`.

La siguiente tabla resume la prioridad y el esfuerzo estimado (en Story Points) para la planificación de los Sprints.

| ID | Épica | Prioridad | Story Points (SP) |
| :--- | :--- | :---: | :---: |
| US-002 | E-01: Estabilización y seguridad | P0 | 1 |
| US-003 | E-01: Estabilización y seguridad | P0 | 2 |
| US-004 | E-01: Estabilización y seguridad | P1 | 2 |
| US-005 | E-01: Estabilización y seguridad | P1 | 3 |
| US-101 | E-02: Refactor a Clean Architecture | P2 | 5 |
| US-102 | E-02: Refactor a Clean Architecture | P2 | 8 |
| US-103 | E-02: Refactor a Clean Architecture | P2 | 5 |
| US-104 | E-02: Refactor a Clean Architecture | P2 | 5 |
| US-105 | E-02: Refactor a Clean Architecture | P2 | 3 |
| US-106 | E-02: Refactor a Clean Architecture | P2 | 8 |
| US-107 | E-02: Refactor a Clean Architecture | P3 | 3 |
| US-201 | E-03: Worker SUNAT real | P0 | 8 |
| US-202 | E-03: Worker SUNAT real | P0 | 8 |
| US-203 | E-03: Worker SUNAT real | P1 | 5 |
| US-204 | E-03: Worker SUNAT real | P2 | 5 |
| US-301 | E-04: Calidad y testing | P1 | 3 |
| US-302 | E-04: Calidad y testing | P2 | 5 |
| US-303 | E-04: Calidad y testing | P2 | 5 |
| US-304 | E-04: Calidad y testing | P3 | 3 |
| US-401 | E-05: Reportes y BI | P3 | 8 |
| US-402 | E-05: Reportes y BI | P3 | 5 |
| US-403 | E-05: Reportes y BI | P3 | 5 |
| US-501 | E-06: App móvil para choferes | P4 | 21 |
| US-601 | E-07: Integraciones futuras | P4 | 8 |
| US-602 | E-07: Integraciones futuras | P4 | 13 |
| US-603 | E-07: Integraciones futuras | P4 | 8 |

### Resumen por Épica
*   **E-01:** 8 SP
*   **E-02:** 37 SP
*   **E-03:** 26 SP
*   **E-04:** 16 SP
*   **E-05:** 18 SP
*   **E-06:** 21 SP
*   **E-07:** 29 SP
*   **Total Estimado del Proyecto:** 155 Story Points
