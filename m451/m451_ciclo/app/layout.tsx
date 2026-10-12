import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const incoming = await headers();
  const host =
    incoming.get("x-forwarded-host") ?? incoming.get("host") ?? "localhost:3000";
  const protocol = incoming.get("x-forwarded-proto") ?? "http";
  const base = new URL(`${protocol}://${host}`);

  return {
    metadataBase: base,
    title: "Ciclo de Gestão Contratual",
    description:
      "Infográfico interativo e responsivo sobre o ciclo de gestão contratual de imóveis públicos.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "Ciclo de Gestão Contratual",
      description: "Explore as seis etapas de um ciclo contínuo de gestão.",
      images: [new URL("/og.png", base).toString()],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Ciclo de Gestão Contratual",
      description: "Explore as seis etapas de um ciclo contínuo de gestão.",
      images: [new URL("/og.png", base).toString()],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
