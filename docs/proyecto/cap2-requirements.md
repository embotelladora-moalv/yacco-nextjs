# Capítulo II: Requerimientos

## 2.1 Competidores

### 2.1.1 Análisis competitivo
A continuación, se presenta una comparativa entre Yacco ERP y las soluciones de facturación y gestión comercial más relevantes en el mercado peruano.

| Característica | Yacco ERP | Nubefact | Bsale | Sitemype |
| :--- | :--- | :--- | :--- | :--- |
| **Foco de Mercado** | Embotelladoras de agua | API Facturación (General) | Retail y POS | PYMEs (General) |
| **Facturación Electrónica (CPE)** | Sí (UBL 2.1) | Sí (Líder API) | Sí | Sí |
| **Guía de Remisión (GRE)** | Sí (Integrada a Ruta) | Sí (Solo API) | Sí | Sí |
| **Control de Envases (Kardex)** | Sí (Especializado) | No | No | No |
| **Gestión de Rutas/Manifiestos** | Sí (Core del sistema) | No | No | Parcial [VERIFICAR] |
| **Cobranzas en Ruta** | Sí (Multi-método) | No | No | No |
| **Modelo de Precios** | [VERIFICAR] | SaaS por volumen | SaaS mensual | SaaS mensual |

### 2.1.2 Estrategias/tácticas frente a competidores
Yacco ERP no busca competir como un facturador genérico, sino como una **solución de última milla especializada**. Nuestra principal ventaja competitiva reside en el **Kardex de Envases Retornables**, una funcionalidad crítica para las embotelladoras que las soluciones generalistas ignoran. Mientras que un competidor requiere que el usuario emita documentos de forma aislada, Yacco vincula la carga del camión (Manifiesto) con la emisión automática de GRE y la liquidación de cobranzas, reduciendo la fricción operativa que genera el uso de múltiples herramientas desvinculadas.

---

## 2.2 Entrevistas

### 2.2.1 Diseño de entrevistas
El objetivo es validar los dolores operativos y las expectativas de cumplimiento tributario.

#### a. Guion para Dueño/Administrador (Segmento Estratégico)
1. ¿Cómo realiza actualmente el seguimiento de las ventas diarias de sus repartidores?
2. ¿Qué tan difícil le resulta saber cuántos envases vacíos tiene cada cliente en su poder?
3. ¿Cuánto tiempo le toma al día emitir las facturas y guías de remisión de todos sus despachos?
4. ¿Ha tenido problemas o multas con SUNAT por errores en la emisión de documentos?
5. ¿Cómo gestiona las cuentas por cobrar de los clientes que compran al crédito?
6. ¿Cómo verifica que lo recaudado en efectivo por el chofer coincida con lo vendido?
7. Si pudiera automatizar una sola tarea de su gestión administrativa, ¿cuál sería?
8. ¿Qué reporte le resultaría más útil para tomar decisiones de crecimiento?

#### b. Guion para Chofer/Repartidor (Segmento Operativo)
1. ¿Cómo sabe qué clientes debe visitar y cuántos bidones debe entregar a cada uno?
2. ¿Qué hace cuando un cliente le pide una factura o boleta en el momento de la entrega?
3. ¿Cómo registra los envases vacíos que recoge de los clientes?
4. ¿Qué es lo que más tiempo le quita durante su ruta de reparto?
5. ¿Cómo reporta los pagos recibidos (efectivo, Yape, transferencias) al final del día?
6. ¿Alguna vez ha tenido problemas con la policía o inspectores por no tener la Guía de Remisión a la mano?
7. ¿Cómo maneja los cambios de precio de último minuto con clientes especiales?
8. ¿Qué tan cómodo se siente usando aplicaciones en su celular durante el trabajo?

### 2.2.2 Registro de entrevistas
| Entrevistado | Cargo | Fecha | Resumen de hallazgos | Link Recurso |
| :--- | :--- | :--- | :--- | :--- |
| [PLACEHOLDER 10] | [PLACEHOLDER 11] | [PLACEHOLDER 12] | [PLACEHOLDER 13] | [PLACEHOLDER 14] |
| [PLACEHOLDER 15] | [PLACEHOLDER 16] | [PLACEHOLDER 17] | [PLACEHOLDER 18] | [PLACEHOLDER 19] |

### 2.2.3 Análisis de entrevistas
[PLACEHOLDER 20: Análisis consolidado de patrones y discrepancias entre los entrevistados].

---

## 2.3 Needfinding

### 2.3.1 User Personas

#### Persona 1: El Administrador (Gerardo)
*   **Foto:** [PLACEHOLDER 21]
*   **Perfil:** Dueño o administrador de la planta, 45 años.
*   **Metas:** Cumplimiento tributario total, cero pérdida de envases, control de caja diario.
*   **Frustraciones:** Errores en Excel, falta de visibilidad de los camiones en ruta, demora en liquidar el día.
*   **Contexto:** Trabaja desde una oficina en planta, usa laptop y revisa reportes por la noche.

#### Persona 2: El Chofer Repartidor (Raúl)
*   **Foto:** [PLACEHOLDER 22]
*   **Perfil:** Repartidor con 5 años de experiencia, 30 años.
*   **Metas:** Terminar su ruta rápido, no tener descuadres de dinero, evitar problemas legales (GRE).
*   **Frustraciones:** Cargar papeles físicos, hacer cálculos mentales de vueltos, olvidar anotar envases recogidos.
*   **Contexto:** Siempre en movimiento, usa smartphone con guantes, trabaja bajo presión de tiempo.

### 2.3.2 User Task Matrix
| Tarea | Administrador | Chofer | Frecuencia | Importancia |
| :--- | :---: | :---: | :--- | :--- |
| Configurar precios/productos | X | | Baja | Alta |
| Asignar pedidos a ruta | X | | Diaria | Crítica |
| Emitir Guía de Remisión (GRE) | X | | Diaria | Crítica |
| Registrar venta en ruta | | X | Muy Alta | Crítica |
| Cobrar (Efectivo/Digital) | | X | Muy Alta | Alta |
| Registrar retorno de envases | | X | Muy Alta | Crítica |
| Liquidar caja del día | X | X | Diaria | Alta |

### 2.3.3 User Journey Mapping (As-Is)
*   **Fase 1: Preparación.** El admin anota pedidos en papel/WhatsApp. El chofer carga el camión "al ojo".
*   **Fase 2: En Ruta.** El chofer visita clientes, si piden factura, debe llamar a la oficina. Emociones: Estrés.
*   **Fase 3: Transacción.** Cobro manual, anotación en cuaderno. Riesgo: Error en suma o pérdida de dinero.
*   **Fase 4: Cierre.** Regreso a planta a las 7 PM. El admin y el chofer pasan 1 hora cuadrando envases y dinero.

### 2.3.4 Empathy Mapping (Chofer)
*   **¿Qué ve?** Tráfico, papeles arrugados, clientes apurados.
*   **¿Qué oye?** Quejas por demoras, el ruido del motor.
*   **¿Qué dice/hace?** "Mañana te traigo el comprobante", cuenta dinero rápido.
*   **¿Qué siente?** Preocupación por perder envases que luego le descuentan de su sueldo.

### 2.3.5 As-is Scenario Mapping
1. **Entrada:** Pedido por teléfono.
2. **Proceso:** Anotación en bitácora física -> Carga de camión -> Salida sin Guía Electrónica (o guía manual).
3. **Salida:** Entrega -> Pago -> Anotación en cuaderno.
4. **Feedback:** Cuadre manual al final del día con discrepancias frecuentes.

---

## 2.4 Ubiquitous Language
*   **SUNAT:** Superintendencia Nacional de Aduanas y de Administración Tributaria.
*   **RUC:** Registro Único de Contribuyente (11 dígitos).
*   **GRE (Tipo 09):** Guía de Remisión Remitente, obligatoria para trasladar bidones.
*   **CDR:** Constancia de Recepción de SUNAT (valida el documento).
*   **UBL 2.1:** Estándar XML para comprobantes electrónicos en Perú.
*   **Ubigeo:** Código de 6 dígitos para identificar distritos (vital para GRE).
*   **Manifiesto/Despacho:** Documento que agrupa la carga y ruta de un camión.
*   **Liquidación:** Proceso de cierre donde se cuadra dinero, ventas y envases al volver de ruta.
*   **Bidón:** Unidad principal de producto (20L o 7L).
*   **Envase prestado:** Saldo de envases que el cliente tiene y debe devolver.
*   **Ruta de Reparto:** Secuencia de clientes asignada a un camión.
