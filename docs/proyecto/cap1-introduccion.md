# Capítulo I: Introducción

## 1.1 Startup Profile

### 1.1.1 Descripción de la Startup
**Embotelladora Moalv S.A.C.** (RUC: 20612769151) es una empresa peruana dedicada a la purificación y comercialización de agua potable envasada. Ubicada estratégicamente para atender el mercado local, la empresa se especializa en la distribución directa mediante una flota de unidades propias (despacho en ruta). Su modelo de negocio se basa en la rotación de envases retornables y la atención personalizada a clientes finales y establecimientos comerciales.

*   **Misión:** Proveer agua de la más alta calidad y pureza, garantizando la salud y bienestar de nuestros clientes a través de un servicio de distribución eficiente, puntual y transparente.
*   **Visión:** Consolidarse como la embotelladora líder en la región, reconocida por su excelencia operativa, innovación tecnológica en procesos de purificación y compromiso con la sostenibilidad mediante el control riguroso de envases retornables.

### 1.1.2 Perfiles del equipo
| Nombre | Rol | Fortalezas |
| :--- | :--- | :--- |
| [PLACEHOLDER 1] | Product Owner / CEO | [PLACEHOLDER 2] |
| [PLACEHOLDER 3] | Full-stack Developer | [PLACEHOLDER 4] |
| [PLACEHOLDER 5] | UI/UX Designer | [PLACEHOLDER 6] |
| [PLACEHOLDER 7] | QA Engineer | [PLACEHOLDER 8] |

---

## 1.2 Solution Profile

### 1.2.1 Antecedentes y problemática
La industria de embotellado de agua en el Perú enfrenta desafíos logísticos y tributarios críticos. Moalv S.A.C. identifica los siguientes puntos de dolor en su gestión actual:

1.  **Gestión Manual de Despacho:** El armado de rutas y el control de carga en camiones se realiza mediante procesos tradicionales, lo que genera errores en el inventario de salida y retorno.
2.  **Inconsistencia en Facturación Electrónica:** La dependencia de sistemas externos o procesos manuales para la emisión de Facturas, Boletas y Guías de Remisión (GRE) genera retrasos y posibles contingencias ante la SUNAT.
3.  **Control de Envases (Kardex):** La falta de un seguimiento digitalizado de los envases vacíos (retornables) entregados y recogidos resulta en pérdidas económicas significativas.
4.  **Conciliación de Cobranzas:** El registro de ventas en campo (efectivo, transferencias, créditos) no se sincroniza en tiempo real con la contabilidad central, dificultando la visibilidad del flujo de caja.

### 1.2.2 Lean UX

#### a. Problem Statements
El sistema actual de gestión de Embotelladora Moalv S.A.C. es ineficiente para escalar las operaciones de distribución en ruta. Los despachadores carecen de herramientas digitales para registrar ventas y retornos de envases en tiempo real, lo que causa una discrepancia del [PLACEHOLDER 9]% entre el inventario físico y los registros contables, además de exponer a la empresa a multas por emisión tardía de documentos electrónicos ante SUNAT.

#### b. Assumptions
*   **Usuarios:** Los choferes y auxiliares están dispuestos a usar una aplicación web en tablets/smartphones para registrar sus ventas.
*   **Valor:** El control automatizado de envases reducirá las pérdidas anuales por envases no retornados.
*   **Negocio:** La integración directa con SUNAT para GRE y Facturación reducirá el tiempo administrativo en un 50%.
*   **Tecnología:** Firebase proporciona la latencia necesaria para actualizaciones en tiempo real entre la planta y la ruta.

#### c. Hypothesis
Creemos que al implementar un sistema ERP web responsivo que centralice el despacho, el Kardex de envases y la facturación electrónica automatizada, lograremos reducir las discrepancias de inventario y los errores tributarios. Sabremos que hemos tenido éxito cuando el tiempo de liquidación de rutas al final del día se reduzca de horas a minutos y cuando el 100% de las ventas en ruta cuenten con un comprobante electrónico válido en el momento de la entrega.

#### d. Lean UX Canvas
1.  **Business Problem:** Gestión manual de rutas, pérdida de envases y facturación desincronizada.
2.  **Business Outcomes:** Reducción de merma de envases, liquidación de caja inmediata, cumplimiento tributario 100%.
3.  **Users:** Administradores de planta, Choferes de despacho, Personal contable.
4.  **User Benefits:** Menos carga administrativa, rutas optimizadas, soporte legal en cada entrega.
5.  **Solutions:** Módulo de Despacho, Kardex Digital, Integración API SUNAT REST/SOAP, Panel de Cobranzas.
6.  **Hypothesis:** (Ver sección c).
7.  **What’s the most important thing we need to learn first?:** ¿Es la interfaz lo suficientemente intuitiva para los choferes en condiciones de campo?
8.  **What’s the least amount of work we need to do to learn that next important thing?:** Implementar el módulo de "Liquidación de Ruta" y probarlo con un chofer real durante una semana.

---

## 1.3 Segmentos objetivo
El proyecto está diseñado primariamente para **Embotelladora Moalv S.A.C.**, operando en el sector B2B y B2C de purificación de agua. Sin embargo, la solución es altamente escalable para:
*   Pequeñas y medianas embotelladoras de agua potable en el territorio peruano.
*   Distribuidoras mayoristas de bebidas que operen con modelos de envases retornables.
*   Empresas de servicios logísticos "última milla" que requieran integración tributaria inmediata en Perú.
