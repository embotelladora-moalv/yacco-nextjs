// test-sunat-oauth.ts
// Ejecuta: node --loader ts-node/esm test-sunat-oauth.ts

export async function testSunatOAuth() {
  const ruc = process.env.SUNAT_RUC!;
  const user = process.env.SUNAT_USER_SOL!;
  const password = process.env.SUNAT_PASS_SOL!;
  const clientId = process.env.SUNAT_CLIENT_ID!;
  const clientSecret = process.env.SUNAT_CLIENT_SECRET!;

  console.log("🔍 Probando credenciales OAuth2 de SUNAT...\n");
  console.log("RUC:", ruc);
  console.log("Usuario:", user);
  console.log("CLIENT_ID:", clientId);
  console.log("CLIENT_SECRET:", clientSecret.substring(0, 8) + "...\n");

  const authUrl = `https://api-seguridad.sunat.gob.pe/v1/clientessol/${clientId}/oauth2/token/`;

  const params = new URLSearchParams();
  params.append("grant_type", "password");
  params.append("scope", "https://api-cpe.sunat.gob.pe");
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("username", `${ruc}${user}`);
  params.append("password", password);

  try {
    const response = await fetch(authUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Error obteniendo token:");
      console.error("Status:", response.status);
      console.error("Response:", JSON.stringify(data, null, 2));

      if (response.status === 401) {
        console.error(
          "\n🔴 Error 401: Credenciales incorrectas o aplicación no autorizada.",
        );
        console.error(
          "   → Verifica CLIENT_ID y CLIENT_SECRET en el Portal de SUNAT",
        );
        console.error(
          "   → Verifica que el usuario SOL y contraseña sean correctos",
        );
      }

      process.exit(1);
    }

    console.log("✅ Token obtenido exitosamente!");
    console.log("Access Token:", data.access_token.substring(0, 50) + "...");
    console.log("Expires in:", data.expires_in, "segundos");
    console.log("\n🎉 Las credenciales OAuth2 están correctas!");
  } catch (error) {
    console.error("❌ Error de conexión:", error);
    process.exit(1);
  }
}

// testSunatOAuth();
