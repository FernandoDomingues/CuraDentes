// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA INICIAL (INDEX)
//
// Compõe todas as seções da landing page na ordem correta:
//   Header → Hero → Como Funciona → Top 10 Dentistas → Especialidades
//   → CTA Banner → Missão/Visão/Valores → App Mobile → Footer
//
// Geolocalização: o hook useUserLocation é chamado aqui para solicitar a
// permissão de localização assim que o usuário abre o site. Os dados ficam
// disponíveis para uso futuro (busca por proximidade, estatísticas, etc.).
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
import { useUserLocation } from "@/hooks/useUserLocation";

const Index = () => {
  // ─── Geolocalização ─────────────────────────────────────────────────────────
  // Solicita a localização do usuário assim que a página carrega.
  // O prompt nativo do navegador é exibido pedindo autorização.
  //
  // Dados disponíveis para uso futuro:
  //   latitude, longitude → busca de dentistas por proximidade real
  //   statusPermissao     → personalizar mensagens ao usuário
  //
  // Para usar os dados, descomente as variáveis abaixo e passe para os
  // componentes que precisam deles (ex: HeroSection para busca por GPS).
  const { latitude, longitude, statusPermissao } = useUserLocation();

  // Log de desenvolvimento — remover em produção
  if (statusPermissao === "autorizado") {
    console.log("[Index] Localização disponível:", latitude, longitude);
  }

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
