// test-gre-access.ts
// Prueba si tu RUC tiene acceso al endpoint de Guías de Remisión (GEM)

export async function testGreAccess() {
  const ruc = process.env.SUNAT_RUC!;
  const user = process.env.SUNAT_USER_SOL!;
  const password = process.env.SUNAT_PASS_SOL!;
  const clientId = process.env.SUNAT_CLIENT_ID!;
  const clientSecret = process.env.SUNAT_CLIENT_SECRET!;

  console.log("🧪 Probando acceso al endpoint de GRE de SUNAT\n");
  console.log("RUC:", ruc);
  console.log("Usuario:", user, "\n");

  // Paso 1: Obtener token
  console.log("📝 Paso 1: Obteniendo token OAuth2...");

  const authUrl = `https://api-seguridad.sunat.gob.pe/v1/clientessol/${clientId}/oauth2/token/`;
  const params = new URLSearchParams();
  params.append("grant_type", "password");
  params.append("scope", "https://api-cpe.sunat.gob.pe");
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("username", `${ruc}${user}`);
  params.append("password", password);

  try {
    const authResponse = await fetch(authUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: params.toString(),
    });

    const authData = await authResponse.json();

    if (!authResponse.ok) {
      console.error("❌ No se pudo obtener el token:");
      console.error(JSON.stringify(authData, null, 2));
      process.exit(1);
    }

    const token = authData.access_token;
    console.log("✅ Token obtenido:", token.substring(0, 50) + "...\n");

    // Paso 2: Intentar acceder al endpoint de GRE con un GET (consulta)
    console.log("📝 Paso 2: Probando acceso al endpoint /gem/...");

    // Intentamos consultar envíos (si hay) - esto nos dirá si tenemos acceso
    const greUrl =
      "https://api-cpe.sunat.gob.pe/v1/contribuyente/gem/comprobantes/envios";

    console.log("URL de prueba:", greUrl);

    const greResponse = await fetch(greUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    console.log("Status:", greResponse.status, greResponse.statusText);

    const greData = await greResponse.json();

    if (greResponse.status === 401) {
      console.error("\n❌ ERROR 401: NO TIENES ACCESO AL SERVICIO GRE");
      console.error("\n🔧 Soluciones:");
      console.error("\n1️⃣  INSCRIPCIÓN EN GRE (SUNAT SOL):");
      console.error("    a. Ingresa a: https://www.sunat.gob.pe/");
      console.error(
        "    b. Ve a: Comprobantes Electrónicos → GRE → Consultar Inscripción",
      );
      console.error("    c. Si NO estás inscrito:");
      console.error(
        "       → Comprobantes Electrónicos → GRE → Solicitud de Inscripción",
      );
      console.error("       → Tipo: Emisor Electrónico");
      console.error("       → Modalidad: Sistema Propio");
      console.error("       → SUNAT te activa en 24-48 horas");

      console.error("\n2️⃣  HABILITACIÓN DE API GEM (Portal Desarrolladores):");
      console.error("    a. Ingresa a: https://api-cpe.sunat.gob.pe/");
      console.error("    b. Ve a: Mis Aplicaciones");
      console.error("    c. Edita tu aplicación");
      console.error("    d. Verifica que tenga marcado:");
      console.error("       ✓ API de Guías de Remisión Electrónicas (GEM)");
      console.error("       ✓ Scope: https://api-cpe.sunat.gob.pe");
      console.error(
        "    e. Si no está marcado, solicita acceso (1-3 días hábiles)",
      );

      console.error("\n📞 Si ya hiciste todo esto y sigue fallando:");
      console.error(
        "    → Contacta al soporte de SUNAT: sunat.gob.pe/contacto",
      );
      console.error("    → Mesa de ayuda: (01) 315-0730");

      process.exit(1);
    }

    if (greResponse.status === 403) {
      console.error("\n❌ ERROR 403: ACCESO PROHIBIDO");
      console.error("Tu RUC no tiene permisos para este servicio.");
      console.error("Contacta a SUNAT para solicitar acceso a GEM.");
      process.exit(1);
    }

    if (greResponse.status === 200) {
      console.log("\n✅ ¡ACCESO CORRECTO AL SERVICIO GRE!");
      console.log("Respuesta de SUNAT:");
      console.log(JSON.stringify(greData, null, 2));
      console.log(
        "\n🎉 Tu RUC está autorizado para enviar Guías de Remisión electrónicas.",
      );
      console.log(
        "El problema debe ser otro (formato del fileName, XML, etc.)",
      );
    } else {
      console.log("\n⚠️  Status inesperado:", greResponse.status);
      console.log("Respuesta:");
      console.log(JSON.stringify(greData, null, 2));
    }
  } catch (error) {
    console.error("\n❌ Error durante la prueba:");
    console.error(error);
    process.exit(1);
  }
}
