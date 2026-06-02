// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA INICIAL (INDEX)
//
// Compõe todas as seções da landing page na ordem correta:
//   Header → Hero → Como Funciona → Top 10 Dentistas → Especialidades
//   → CTA Banner → Missão/Visão/Valores → App Mobile → Footer
//
// Geolocalização: a permissão do navegador só é solicitada quando o usuário
// clica explicitamente em "Usar minha localização" dentro do HeroSection.
// ═══════════════════════════════════════════════════════════════════════════════

import Header from "@/components/layout/Header";
import HeroSection from "@/components/features/HeroSection";
import HowItWorks from "@/components/features/HowItWorks";
import LatestDentists from "@/components/features/LatestDentists";
import Specialties from "@/components/features/Specialties";
import CtaBanner from "@/components/features/CtaBanner";
import AboutSection from "@/components/features/AboutSection";
import AppSection from "@/components/features/AppSection";
import Footer from "@/components/layout/Footer";

const Index = () => {
  return (
    <div className="min-h-screen" style={{ background: "#F2F2F7" }}>
      <Header />
      <main>
        {/* Barra de busca, filtros de especialidade e hero */}
        <HeroSection />

        {/* Explicação das 3 etapas para agendar */}
        <HowItWorks />

        {/* Últimos 15 Dentistas Cadastrados */}
        <LatestDentists />

        {/* Grade de especialidades disponíveis */}
        <Specialties />

        {/* Banner de chamada para ação */}
        <CtaBanner />

        {/* Missão, Visão e Valores do CuraDentes */}
        <AboutSection />

        {/* Seção do app mobile — mockup visível só em desktop */}
        <AppSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
