import JSZip from "jszip";
import crypto from "crypto";

/**
 * 1. Obtener Token OAuth2 de SUNAT
 * El token tiene un tiempo de vida (generalmente 3600 segundos/1 hora).
 * En un sistema Enterprise de alto tráfico, este token debería guardarse en Redis o en memoria.
 */
export async function getSunatToken(): Promise<string> {
  const ruc = process.env.SUNAT_RUC!;
  const user = process.env.SUNAT_USER_SOL!;
  const password = process.env.SUNAT_PASS_SOL!;
  const clientId = process.env.SUNAT_CLIENT_ID!;
  const clientSecret = process.env.SUNAT_CLIENT_SECRET!;

  // Endpoint de autenticación (BETA) - Para Producción quitar "-beta"
  const authUrl = `https://gre-test.sunat.gob.pe/v1/clientesextranet/${clientId}/oauth2/token/`;
  // Nota: Para Producción es: `https://api-seguridad.sunat.gob.pe/v1/clientesextranet/${clientId}/oauth2/token/`

  const params = new URLSearchParams();
  params.append("grant_type", "password");
  params.append("scope", "https://api-sire.sunat.gob.pe"); // Scope para GRE
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("username", `${ruc}${user}`);
  params.append("password", password);

  const response = await fetch(authUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error(`Error obteniendo token SUNAT: ${JSON.stringify(data)}`);
  }

  return data.access_token;
}

/**
 * 2. Enviar la Guía de Remisión mediante API REST
 */
export async function sendGuiaToSunatRest(fileName: string, signedXml: string) {
  // 1. Obtener el Token
  const token = await getSunatToken();

  // 2. Comprimir el XML en un archivo ZIP (Requisito de la API)
  const zip = new JSZip();
  zip.file(`${fileName}.xml`, signedXml);
  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

  // 3. Generar Base64 y Hash SHA-256 del ZIP
  const zipBase64 = zipBuffer.toString("base64");
  const hashZip = crypto.createHash("sha256").update(zipBuffer).digest("hex");

  // 4. Construir el payload JSON
  const payload = {
    archivo: {
      nomArchivo: `${fileName}.zip`,
      arcGreZip: zipBase64,
      hashZip: hashZip,
    },
  };

  // Endpoint de envío de GRE (BETA) - Para Producción quitar "-beta"
  const greUrl = `https://gre-test.sunat.gob.pe/v1/contribuyente/gem/comprobantes/${fileName}`;
  // Nota: Para Producción es: `https://api-cpe.sunat.gob.pe/v1/contribuyente/gem/comprobantes/${fileName}`

  // 5. Hacer la petición a SUNAT
  const response = await fetch(greUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(`Rechazo de SUNAT (GRE): ${JSON.stringify(responseData)}`);
  }

  // 6. La API REST devuelve un ticket (proceso asíncrono)
  if (!responseData.numTicket) {
    throw new Error("SUNAT no devolvió un número de ticket para la Guía.");
  }

  return responseData.numTicket;
}

/**
 * 3. Consultar el estado del Ticket de una GRE en la API REST
 */
export async function getGreTicketStatusRest(numTicket: string) {
  const token = await getSunatToken();

  // Endpoint de consulta (BETA) - Para Producción quitar "-test"
  const url = `https://gre-test.sunat.gob.pe/v1/contribuyente/gem/comprobantes/envios/${numTicket}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(
      `Error consultando ticket GRE: ${JSON.stringify(responseData)}`,
    );
  }

  // codRespuesta: "0" = Aceptado, "98" = En proceso, "99" = Rechazado con error
  return {
    status: responseData.codRespuesta,
    cdrZipBase64: responseData.arcCdr, // El ZIP en Base64 con la constancia oficial
    error: responseData.indEstadoCpe === "2" ? responseData.error : null,
  };
}
