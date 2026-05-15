import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "xml-crypto",
    "xpath",
    "@xmldom/xmldom",
    "node-forge",
  ],
  async redirects() {
    return [
      {
        source: "/",
        destination: "/dashboard",
        permanent: true, // Usa 'true' solo si la raíz nunca tendrá contenido público
      },
    ];
  },
};

export default nextConfig;
