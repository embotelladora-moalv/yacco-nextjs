# Plan de Acción: BUG-03 — Worker SUNAT Real

## 1. Problema
El worker `processSunatQueue` en Cloud Functions actualmente simula la emisión a SUNAT con un `setTimeout` y IDs aleatorios. Esto genera documentos "fantasma" en la base de datos que no existen ante la autoridad tributaria.

## 2. Requerimientos Técnicos
Para que el worker sea real, necesita:
- **Lógica de negocio**: Generación de XML (UBL 2.1) y Firma Digital.
- **Conectividad**: Llamadas a los endpoints SOAP (Facturas/Boletas) y REST (Guías de Remisión) de SUNAT.
- **Secretos**: RUC, Usuario/Clave SOL, Client ID/Secret (REST), y el Certificado Digital (.p12 en Base64).
- **Persistencia**: Guardar XML/CDR en Firebase Storage y actualizar Firestore.

## 3. Alternativas de Implementación

### Alternativa A: Monorepo con npm Workspaces (RECOMENDADA)
Extraer `services/sunat/` a un paquete compartido `packages/sunat-shared`.
- **Pros**: Única fuente de verdad, desacoplamiento, fácil mantenimiento.
- **Contras**: Requiere reestructurar el proyecto Next.js a monorepo.
- **Esfuerzo**: 8 SP.

### Alternativa B: Duplicación de Código
Copiar los archivos de servicios a `functions/src/sunat/`.
- **Pros**: Implementación inmediata.
- **Contras**: Deuda técnica alta, riesgo de inconsistencia en reglas tributarias (muy peligroso).
- **Esfuerzo**: 3 SP.

### Alternativa C: Proxy por API Endpoint
Que el worker llame a un endpoint privado en Next.js.
- **Pros**: No hay que mover código.
- **Contras**: Problemas de timeout (Cloud Functions tiene límites), acoplamiento de runtime.
- **Esfuerzo**: 5 SP.

## 4. Estrategia Elegida: Alternativa A (Refactor a Workspaces)

### Paso 1: Configurar Workspaces
Modificar el `package.json` raíz:
```json
"workspaces": [
  "packages/*",
  "functions"
]
```
Mover la app Next.js actual a una subcarpeta si es necesario, o dejarla en el root si el gestor de paquetes lo permite (Next.js suele preferir estar en el root, pero podemos crear `packages/` para lo compartido).

### Paso 2: Crear `packages/sunat-shared`
1. Inicializar paquete con `xmlbuilder2`, `xml-crypto`, `jszip`, `node-forge`.
2. Mover `src/services/sunat/*` (excepto `correlativeService.ts`) a este paquete.
3. Refactorizar `correlativeService.ts` para que acepte la instancia de `Firestore` como parámetro, permitiendo su uso tanto en Next.js (Admin SDK) como en Functions.

### Paso 3: Configurar Secretos en Cloud Functions
Usar Google Cloud Secret Manager o variables de entorno de Firebase Functions para:
- `SUNAT_CERT_BASE64`
- `SUNAT_CERT_PASSWORD`
- `SUNAT_RUC`, `SUNAT_USER_SOL`, `SUNAT_PASS_SOL`
- `SUNAT_CLIENT_ID`, `SUNAT_CLIENT_SECRET`

### Paso 4: Implementar el Worker Real
Modificar `functions/src/index.ts` para:
1. Importar los servicios de `@yacco/sunat-shared`.
2. Obtener datos de Firestore.
3. Llamar a `buildInvoiceXml` / `buildDespatchXml`.
4. Llamar a `signXml`.
5. Enviar a SUNAT y procesar la respuesta (Ticket o CDR).
6. Guardar resultados.

## 5. Cronograma Estimado (Sprint 2)
1. **Día 1**: Setup de monorepo y extracción de paquete compartido.
2. **Día 2**: Refactor de dependencias y validación en Next.js.
3. **Día 3**: Implementación del worker real y manejo de errores.
4. **Día 4**: Pruebas en entorno BETA de SUNAT y QA.
