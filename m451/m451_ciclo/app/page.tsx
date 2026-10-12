import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ciclo de Gestão Contratual — Infográfico Interativo",
  description:
    "Navegue pelas seis etapas do ciclo de gestão contratual de imóveis públicos.",
};

export default function Home() {
  return (
    <main className="site-shell">
      <iframe
        className="infographic-frame"
        src="/infografico.html"
        title="Infográfico interativo do ciclo de gestão contratual"
        allow="fullscreen"
      />
    </main>
  );
}
