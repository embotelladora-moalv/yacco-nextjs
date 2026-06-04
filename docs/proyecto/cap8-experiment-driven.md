# Capítulo VIII: Desarrollo Impulsado por Experimentos

> **Declaración de Supuesto Raíz:** El equipo de desarrollo de Yacco ERP busca validar si la automatización de la facturación electrónica ante SUNAT y la generación desatendida de Guías de Remisión Remitente (GRE) reduce el tiempo operativo administrativo en al menos un 70% y disminuye los errores de validación tributaria a menos del 2%, en comparación con el proceso manual actual de Moalv S.A.C. **[SUPUESTO base]**.

## 8.1 Experiment Planning

### 8.1.1 As-Is Summary
Actualmente, Moalv S.A.C. gestiona el despacho de agua mediante registros manuales en cuadernos y hojas de cálculo. La facturación electrónica se realiza de forma reactiva (muchas veces días después de la entrega) y las Guías de Remisión se llenan a mano o mediante sistemas externos desvinculados del inventario real. Esto genera cuellos de botella en la liquidación de caja al final del día y una alta probabilidad de inconsistencias ante SUNAT.

### 8.1.2 Raw Material

**Assumptions (Supuestos):**
*   El administrador pierde aproximadamente 10 horas semanales consolidando ventas manualmente para facturar. **[SUPUESTO]**
*   Los choferes olvidan registrar el retorno del 15% de los envases vacíos debido a la falta de una herramienta móvil. **[SUPUESTO]**
*   SUNAT rechaza el 5% de los documentos por errores de digitación en el ubigeo o peso. **[SUPUESTO]**
*   La latencia de la API de SUNAT no afectará el flujo de salida del camión si se procesa de forma asíncrona.

**Knowledge Gaps (Vacíos de conocimiento):**
*   ¿Cuál es el tiempo exacto que toma emitir un comprobante desde que se selecciona la venta hasta que se obtiene el CDR?
*   ¿Cuántos intentos fallidos de conexión a la API de SUNAT ocurren en una jornada típica?
*   ¿Cuál es el nivel de adopción digital real de los repartidores con la interfaz web responsiva?

**Ideas:**
*   Implementar un dashboard de métricas en tiempo real que compare "Ventas Realizadas" vs "Ventas Facturadas".
*   Crear un sistema de alertas vía WhatsApp/Email cuando un documento sea rechazado por SUNAT.
*   Utilizar IA (Gemini) para predecir la ruta más eficiente basándose en el historial de entregas.

**Claims:**
*   "La automatización total eliminará las multas por emisión fuera de plazo".
*   "Yacco ERP permitirá a Moalv manejar un 20% más de volumen de ventas con el mismo personal administrativo".

### 8.1.3 Experiment-Ready Questions
*   ¿Reducirá la integración asíncrona (cola de tareas) el tiempo de espera del administrador para emitir 50 comprobantes?
*   ¿Es la validación previa de datos (Zod) suficiente para reducir la tasa de rechazo de SUNAT a menos del 1%?
*   ¿Logrará la interfaz móvil de "Retorno de Vacíos" aumentar la precisión del stock de envases en planta?

### 8.1.4 Question Backlog
| Pregunta | Importancia (1-5) | Incertidumbre (1-5) | Score (Imp x Inc) |
| :--- | :---: | :---: | :---: |
| ¿La automatización reduce el tiempo administrativo? | 5 | 2 | 10 |
| ¿La tasa de rechazo SUNAT bajará del 2%? | 5 | 4 | 20 **[SUPUESTO]** |
| ¿Los choferes usarán la App en ruta sin problemas? | 4 | 5 | 20 **[SUPUESTO]** |
| ¿El costo de Firebase escalará con el volumen de ventas? | 3 | 3 | 9 |

### 8.1.5 Experiment Cards

**Card 1: Validación de Tasa de Rechazo SUNAT**
*   **Hipótesis:** Creemos que la validación estricta de esquemas XML (UBL 2.1) antes del envío reducirá los rechazos tributarios.
*   **Método:** Análisis de logs de `sunatQueue` durante 2 semanas.
*   **Métrica:** Porcentaje de documentos con estado `REJECTED`.
*   **Criterio de éxito:** Tasa de rechazo < 1%.
*   **Duración:** 14 días.

**Card 2: Eficiencia Administrativa**
*   **Hipótesis:** Creemos que la consolidación masiva de ventas en un solo comprobante ahorrará horas al administrador Gerardo.
*   **Método:** Observación directa y cronometraje de la liquidación diaria.
*   **Métrica:** Tiempo total empleado en facturación por día.
*   **Criterio de éxito:** Reducción del 50% vs proceso manual.
*   **Duración:** 7 días.

---

## 8.2 Experiment Design

### 8.2.1 Hypotheses
1.  Creemos que al implementar un worker asíncrono para el envío de GRE para los despachadores, lograremos una salida de planta más rápida, medido por el tiempo transcurrido entre "Carga de Camión" y "Salida Real". **[SUPUESTO]**
2.  Creemos que la validación automática de Ubigeos para los clientes nuevos evitará errores de envío REST, medido por la cantidad de errores 400 devueltos por SUNAT. **[SUPUESTO]**

### 8.2.2 Domain Business Metrics
*   **Tasa de Rechazo SUNAT:** Porcentaje de CDRs con código de error.
*   **Tiempo de Facturación:** Segundos desde el clic hasta la generación del PDF.
*   **Exactitud de Kardex:** Discrepancia entre stock físico y stock digital de envases.
*   **Tasa de Cobranza:** Porcentaje de ventas al crédito pagadas en el plazo pactado.

### 8.2.3 Measures
*   **Fuentes de Datos:** Colección `sunatDocuments` (Firestore), Logs de Google Cloud (Cloud Functions), y métricas de Vercel Analytics.
*   **Instrumento:** Script de agregación de datos que calcule la media diaria de estados exitosos vs errores.

### 8.2.4 Conditions
*   **Grupo Control:** Proceso manual (datos históricos de Moalv S.A.C. antes de Yacco).
*   **Grupo Tratamiento:** Uso integral de Yacco ERP en una ruta piloto. **[SUPUESTO]**

### 8.2.5 Scale Calculations and Decisions
Dado que Yacco ERP es una herramienta interna, el tamaño de la muestra es pequeño (*n* = 1-2 administradores, 3-5 choferes). La validación será de tipo **mixta**: cuantitativa para los tiempos de sistema y cualitativa (entrevistas) para la satisfacción del usuario. No se busca significancia estadística masiva, sino validación de utilidad operativa.

### 8.2.6 Methods Selection
Se utilizará el método de **Análisis de Cohortes (Antes/Después)** comparando el rendimiento de la última semana de gestión manual vs la primera semana de uso del sistema.

### 8.2.7 Data Analytics - Goals/KPIs/Metrics
| Goal | KPI | Métrica (Target) |
| :--- | :--- | :--- |
| Reducir errores tributarios | Tasa de Aceptación SUNAT | > 99% de documentos ACCEPTED. |
| Agilizar el despacho | Tiempo de emisión GRE | < 10 segundos por guía. |
| Mejorar flujo de caja | Índice de Morosidad | < 5% de ventas con deuda > 15 días. |

### 8.2.8 Web Tracking Plan (Solo Web)
| Evento | Trigger | Propiedades | Herramienta |
| :--- | :--- | :--- | :--- |
| `invoice_emitted` | Clic en emitir factura | type, total_amount, client_id | Vercel Analytics **[SUPUESTO]** |
| `sunat_error` | Respuesta errónea de SUNAT | error_code, document_type | Firebase Crashlytics |
| `route_liquidated` | Clic en cerrar ruta | total_cash, envases_devueltos | Vercel Analytics |

---

## 8.3 Experimentation

### 8.3.1 To-Be User Stories (Derivadas del aprendizaje)
| ID | Historia de Usuario |
| :--- | :--- |
| **US-801** | **Como** administrador, **quiero** ver un dashboard de errores de SUNAT detallado, **para** corregir datos de clientes rápidamente sin entrar a los logs. |
| **US-802** | **Como** gerente, **quiero** una alerta automática si la cola de SUNAT tiene más de 5 errores pendientes, **para** evitar retrasos legales. |

### 8.3.2 To-Be Product Backlog
1.  **US-801:** Prioridad P1 (Impacto en usabilidad).
2.  **US-802:** Prioridad P2 (Monitoreo proactivo).

### 8.3.3 Pipeline-supported To-Be Lifecycle

#### 8.3.3.1 To-Be Sprint Backlog (Sprint 5: Experimentos)
*   **Tarea 1:** Implementar vista `/admin/sunat-monitoring` (US-801).
*   **Tarea 2:** Integrar Webhook de Slack para alertas de cola (US-802).

#### 8.3.3.2 Landing Page Evidence
**N/A.** Yacco ERP es una aplicación de gestión interna bajo autenticación. No se requiere landing page de adquisición para el experimento actual.

#### 8.3.3.3 Frontend-Web Evidence
[EVIDENCIA PLACEHOLDER 42: Captura de pantalla del nuevo Dashboard de Monitoreo SUNAT].

#### 8.3.3.4 Native-Mobile Evidence
**N/A.** Se utiliza la versión web responsiva para tablets en los camiones. Se descarta desarrollo nativo para este experimento para reducir costos.

#### 8.3.3.5 RESTful API / Serverless Evidence
Se ha propuesto un nuevo endpoint `GET /api/metrics/sunat-health` que consolida los estados de la última hora para el dashboard.
[EVIDENCIA PLACEHOLDER 43: Captura de Postman consumiendo el endpoint de métricas].

### 8.3.4 To-Be Validation Interviews
#### 8.3.4.1 Diseño: Guion de validación post-experimento
1. ¿El sistema le permitió detectar errores de SUNAT antes que el contador se lo notifique?
2. ¿Qué tan útil le parece la nueva alerta de errores en tiempo real?
3. ¿Siente que el control de envases ahora coincide con lo que ve físicamente en el camión?

#### 8.3.4.2 Registro
| Entrevistador | Usuario | Resultado |
| :--- | :--- | :--- |
| [PLACEHOLDER 44] | [PLACEHOLDER 45] | [PLACEHOLDER 46] |

---

## 8.4 Experiment Aftermath & Analysis

### 8.4.1 Analysis / Interpretation
[PLACEHOLDER: Documentar si la automatización redujo efectivamente el tiempo administrativo y si la tasa de rechazo bajó al nivel esperado].

### 8.4.2 Re-scored Question Backlog
[Plantilla para re-evaluar prioridades tras los resultados del experimento].

---

## 8.5 Continuous Learning
### 8.5.1 Shareback Session Artifacts
*   **Lo que aprendimos:** Los errores 403 de SUNAT se debían a falta de permisos en el RUC, no a código.
*   **Lo que cambia:** Se agregará un checklist de requisitos SOL antes de activar un cliente.
*   **Próximo Experimento:** Validar la facturación desatendida mediante "Autofactura" al final de la ruta.

---

## 8.6 To-Be Software Platform Pre-launch
### 8.6.1 About-the-Product Intro Video
[PLACEHOLDER: Link al video de lanzamiento de la plataforma automatizada].

**Storyboard sugerido (Lanzamiento):**
1.  Recapitulación del caos manual anterior.
2.  Muestra de la velocidad de emisión actual.
3.  Testimonio del administrador sobre el tiempo ganado.
4.  Cierre con la visión de "Moalv 100% digital".
