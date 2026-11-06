import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, Source_Serif_4 } from "next/font/google";
import { SupabaseAuthRedirect } from "@/components/supabase-auth-redirect";
import { Toaster } from "sonner";

import "./globals.css";
import "./theme-wrapup.css";

import { PRODUCT_TAB_TITLE, WRAPUP_THEME_ACTIVE } from "@/lib/product";

const archivo = Archivo({
  variable: "--font-wrapup-ui",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-doc",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono-ui",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const theme = WRAPUP_THEME_ACTIVE ? "wrapup" : undefined;

export const metadata: Metadata = {
  title: PRODUCT_TAB_TITLE,
  description: WRAPUP_THEME_ACTIVE
    ? "Produksjonsbordet — prosjekter, crew, dagsplan og lønningslister. En tjeneste i WrapUp."
    : "Internt crew-verktøy for Aparent",
  icons: {
    icon: [
      { url: "/Favicon/favicon.svg", type: "image/svg+xml" },
      { url: "/Favicon/icon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/Favicon/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/Favicon/icon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/Favicon/icon-64.png", sizes: "64x64", type: "image/png" },
      { url: "/Favicon/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/Favicon/apple-icon.png", sizes: "180x180" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="nb"
      data-theme={theme}
      className={`${archivo.variable} ${sourceSerif.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans text-foreground">
        <SupabaseAuthRedirect />
        {children}
        <Toaster richColors closeButton position="top-center" />
      </body>
    </html>
  );
}
