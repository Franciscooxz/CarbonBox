import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Genera un servidor Node mínimo en .next/standalone: la imagen Docker no necesita node_modules completo.
  output: "standalone",
};

export default nextConfig;
