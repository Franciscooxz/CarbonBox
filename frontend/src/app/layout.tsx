import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from "next/font/google";
import type { ReactNode } from "react";
import { Layout } from "@/shared/components/Layout";
import "@/styles/globals.css";
import { Providers } from "./providers";

// next/font descarga las fuentes en el build y las sirve desde el propio dominio (sin peticiones a Google en runtime).
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", style: ["normal", "italic"] });
const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-sans" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono" });

export const metadata: Metadata = {
  title: "CarbonBox · Registro de actividad",
  description: "Sube archivos CSV de actividad y revisa su procesamiento asíncrono",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es" className={`${newsreader.variable} ${plexSans.variable} ${plexMono.variable}`}>
      <body className="font-sans antialiased">
        <Providers>
          <Layout>{children}</Layout>
        </Providers>
      </body>
    </html>
  );
}
