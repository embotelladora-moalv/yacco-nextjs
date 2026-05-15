// src/services/sunat/xmlSigner.ts
import * as forge from "node-forge";

/**
 * Extrae llaves del PFX siguiendo el estándar X.509 v3 exigido
 */
function extractKeysFromPfx(pfxBase64: string, password: string) {
  const pfxDer = forge.util.decode64(pfxBase64);
  const p12Asn1 = forge.asn1.fromDer(pfxDer);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const certBag = certBags[forge.pki.oids.certBag]?.[0];
  if (!certBag || !certBag.cert) throw new Error("Certificado no encontrado");

  const certPem = forge.pki.certificateToPem(certBag.cert);
  const cleanCert = certPem.replace(
    /-----(BEGIN|END) CERTIFICATE-----|[\n\r]/g,
    "",
  );

  let keyBag = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[
    forge.pki.oids.pkcs8ShroudedKeyBag
  ]?.[0];
  if (!keyBag)
    keyBag = p12.getBags({ bagType: forge.pki.oids.keyBag })[
      forge.pki.oids.keyBag
    ]?.[0];
  if (!keyBag || !keyBag.key) throw new Error("Llave privada no encontrada");

  return { privateKey: keyBag.key, cleanCert };
}

/**
 * Implementación de firma digital basada en el Manual del Programador SUNAT
 */
export function signXml(xmlString: string): string {
  const { privateKey, cleanCert } = extractKeysFromPfx(
    process.env.SUNAT_CERT_BASE64!,
    process.env.SUNAT_CERT_PASSWORD!,
  );

  // 1. CANONICALIZACIÓN: SUNAT exige firmar el documento completo (URI="")
  // Eliminamos espacios entre etiquetas para asegurar que el hash coincida tras la recepción
  const xmlBody = xmlString.replace(/<\?xml.*?\?>/, "").trim();
  const canonicalXml = xmlBody.replace(/>\s+</g, "><");

  // 2. DIGEST: Calculamos el hash SHA-256 del contenido
  const md = forge.md.sha256.create();
  md.update(canonicalXml, "utf8");
  const digestValue = forge.util.encode64(md.digest().getBytes());

  // 3. SIGNED INFO: Bloque de control estructural
  const signedInfoXml =
    `<ds:SignedInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">` +
    `<ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>` +
    `<ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>` +
    `<ds:Reference URI="">` +
    `<ds:Transforms>` +
    `<ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>` +
    `</ds:Transforms>` +
    `<ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>` +
    `<ds:DigestValue>${digestValue}</ds:DigestValue>` +
    `</ds:Reference>` +
    `</ds:SignedInfo>`;

  // 4. FIRMA: SignatureValue (RSA-SHA256)
  const mdSig = forge.md.sha256.create();
  mdSig.update(signedInfoXml, "utf8");
  const signatureValue = forge.util.encode64((privateKey as any).sign(mdSig));

  // 5. ENSAMBLAJE: Estructura final de la firma
  const fullSignature =
    `<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="SignatureRosimo">` +
    signedInfoXml +
    `<ds:SignatureValue>${signatureValue}</ds:SignatureValue>` +
    `<ds:KeyInfo>` +
    `<ds:X509Data>` +
    `<ds:X509Certificate>${cleanCert}</ds:X509Certificate>` +
    `</ds:X509Data>` +
    `</ds:KeyInfo>` +
    `</ds:Signature>`;

  // 6. INYECCIÓN: La firma se consigna en ext:ExtensionContent
  const finalXml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    canonicalXml.replace(
      /<ext:ExtensionContent\s*\/?>(?:<\/ext:ExtensionContent>)?/,
      `<ext:ExtensionContent>${fullSignature}</ext:ExtensionContent>`,
    );

  return finalXml;
}
