// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA: Especialidade (/especialidade/:slug)
//
// Página de detalhes de uma especialidade odontológica com:
//   - Descrição SEO da especialidade
//   - Lista de dentistas que oferecem aquela especialidade
//   - Perguntas frequentes (FAQ)
// ═══════════════════════════════════════════════════════════════════════════════

import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { ESPECIALIDADES_SEO } from "@/constants/especialidadesSEO";
import { ESPECIALIDADES } from "@/constants/data";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { toast } from "sonner";
import { Star, MapPin, ChevronRight, CheckCircle, ExternalLink, Search, Navigation } from "lucide-react";

export default function Especialidade() {
  const { slug } = useParams<{ slug: string }>();

  const especialidade = Object.values(ESPECIALIDADES_SEO).find(e => e.slug === slug);
  const nome = especialidade?.nome || "";
  const notFound = !especialidade;

  useEffect(() => {
    if (especialidade) {
      document.title = especialidade.title;
      const meta = document.querySelector('meta[name="description"]');
      if (meta) {
        meta.setAttribute("content", especialidade.description);
      }
    }
    return () => {
      document.title = "CuraDentes";
    };
  }, [especialidade]);

  const navigate = useNavigate();
  const { user, signInWithGoogle } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  interface TopDentista {
    dentista_id: string;
    dentista_nome: string;
    dentista_foto: string | null;
    dentista_avaliacao: number;
    endereco_cidade: string;
    endereco_estado: string;
  }

  const [topDentistas, setTopDentistas] = useState<TopDentista[]>([]);
  const [topLoading, setTopLoading] = useState(true);
  const [userCity, setUserCity] = useState<string | null>(() => {
    try { return sessionStorage.getItem("curadentes_user_city"); } catch { return null; }
  });

  useEffect(() => {
    const userLat = user?.latitude;
    const userLng = user?.longitude;
    if (userCity) return;
    if (!userLat || !userLng) return;

    let cancelled = false;
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${userLat}&lon=${userLng}&format=json&accept-language=pt`;

    fetch(url, { headers: { "User-Agent": "CuraDentes/1.0" } })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const city =
          data?.address?.city ||
          data?.address?.town ||
          data?.address?.village ||
          data?.address?.municipality ||
          data?.address?.county ||
          "";
        if (city) {
          setUserCity(city);
          try { sessionStorage.setItem("curadentes_user_city", city); } catch { /* sessionStorage indisponível */ }
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [user?.latitude, user?.longitude, userCity]);

  useEffect(() => {
    let cancelled = false;

    supabase
      .rpc("get_top_dentistas_especialidade", {
        especialidade_nome: nome,
        cidade_usuario: userCity,
      })
      .then(async ({ data, error }) => {
        if (!cancelled && !error && data) {
          let top = data as TopDentista[];
          // Enriquece o nome com o tratamento (Dr./Dra.)
          const ids = top.map((d) => d.dentista_id).filter(Boolean);
          if (ids.length > 0) {
            const { data: trats } = await supabase
              .from("curadentespro")
              .select("id, tratamento")
              .in("id", ids);
            if (trats && trats.length > 0) {
              const tratMap: Record<string, string> = {};
              trats.forEach((t: { id: string; tratamento: string | null }) => {
                if (t.tratamento) tratMap[t.id] = t.tratamento;
              });
              top = top.map((d) => {
                const t = tratMap[d.dentista_id];
                return t && !d.dentista_nome.startsWith(t)
                  ? { ...d, dentista_nome: `${t} ${d.dentista_nome}` }
                  : d;
              });
            }
          }
          if (!cancelled) setTopDentistas(top);
        }
        if (!cancelled) setTopLoading(false);
      });

    return () => { cancelled = true; };
  }, [nome, userCity]);

  useEffect(() => {
    const pending = sessionStorage.getItem("curadentes_pending_nav");
    if (!pending) return;
    if (!user) return;
    sessionStorage.removeItem("curadentes_pending_nav");
    const nav = JSON.parse(pending);
    navigate(nav.path + (nav.params || ""), { state: nav.state, replace: true });
  }, [user, navigate]);

  // Early return só APÓS todos os hooks (rules-of-hooks)
  if (notFound) {
    return (
      <>
        <Header />
        <main className="min-h-[60vh] flex items-center justify-center px-5">
          <div className="text-center max-w-md">
            <h1 className="text-3xl font-bold mb-4" style={{ color: "#0A2A66" }}>Especialidade não encontrada</h1>
            <p className="text-gray-500 mb-6">A especialidade que você procura não existe ou foi removida.</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-white transition-all"
              style={{ background: "#007AFF" }}
            >
              Voltar para Home
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Resolve a cidade do usuário: usa o cache (userCity/sessionStorage) ou faz o
  // reverse-geocode da localização do login sob demanda (garante a cidade no clique).
  const resolverCidadeUsuario = async (): Promise<string> => {
    if (userCity) return userCity;
    const lat = user?.latitude;
    const lng = user?.longitude;
    if (!lat || !lng) return "";
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=pt`;
      const r = await fetch(url, { headers: { "User-Agent": "CuraDentes/1.0" } });
      const data = await r.json();
      const city =
        data?.address?.city || data?.address?.town || data?.address?.village ||
        data?.address?.municipality || data?.address?.county || "";
      if (city) {
        setUserCity(city);
        try { sessionStorage.setItem("curadentes_user_city", city); } catch { /* sessionStorage indisponível */ }
      }
      return city;
    } catch {
      return "";
    }
  };

  const saveAndRedirectToLogin = () => {
    const searchQuery = userCity || ""; // texto da busca = cidade do usuário (a especialidade vai em "atividade")
    sessionStorage.setItem(
      "curadentes_pending_nav",
      JSON.stringify({
        path: "/pesquisa",
        params: `?q=${encodeURIComponent(searchQuery)}`,
        state: {
          q: searchQuery,
          lat: user?.latitude ? String(user.latitude) : undefined,
          lng: user?.longitude ? String(user.longitude) : undefined,
          atividade: nome,
        },
      })
    );
    sessionStorage.setItem("curadentes_search_state", JSON.stringify({ q: searchQuery }));
    setShowLoginModal(true);
  };

  const handleGoogleLogin = async () => {
    const loadingToast = toast.loading("Redirecionando para o Google...");
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            await signInWithGoogle(latitude, longitude);
            toast.dismiss(loadingToast);
          },
          async () => {
            await signInWithGoogle(null, null);
            toast.dismiss(loadingToast);
          },
          { timeout: 5000 }
        );
      } else {
        await signInWithGoogle(null, null);
        toast.dismiss(loadingToast);
      }
    } catch {
      toast.dismiss(loadingToast);
      toast.error("Falha ao inicializar login com o Google.");
    }
  };

  const handleSearchNearby = async () => {
    if (!user) {
      saveAndRedirectToLogin();
      return;
    }
    const userLat = user?.latitude;
    const userLng = user?.longitude;
    const searchQuery = await resolverCidadeUsuario(); // cidade do usuário (a especialidade vai em "atividade")
    navigate(
      `/pesquisa?q=${encodeURIComponent(searchQuery)}`,
      {
        state: {
          q: searchQuery,
          lat: userLat ? String(userLat) : undefined,
          lng: userLng ? String(userLng) : undefined,
          atividade: nome,
        },
      }
    );
  };

  const schemaJson = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: especialidade.title,
    description: especialidade.description,
    keywords: especialidade.keywords.join(", "),
    specialty: nome,
    mainEntity: {
      "@type": "MedicalProcedure",
      name: nome,
      description: especialidade.introducao,
    },
  };

  return (
    <>
      <script type="application/ld+json">
        {JSON.stringify(schemaJson)}
      </script>

      <Header />

      <main>
        {/* Breadcrumb */}
        <nav className="container mx-auto px-5 md:px-8 lg:px-16 py-3" aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-[13px]" style={{ color: "#8E8E93" }}>
            <li><Link to="/" className="hover:text-[#007AFF] transition-colors">Home</Link></li>
            <ChevronRight size={12} />
            <li><Link to="/#especialidades" className="hover:text-[#007AFF] transition-colors">Especialidades</Link></li>
            <ChevronRight size={12} />
            <li aria-current="page" style={{ color: "#0A2A66", fontWeight: 600 }}>{especialidade.nome}</li>
          </ol>
        </nav>

        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0A2A66] to-[#1a4b99] opacity-90" />
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-10">
            <div style={{ background: "radial-gradient(circle at 70% 30%, rgba(255,255,255,0.3) 0%, transparent 60%)", width: "100%", height: "100%" }} />
          </div>
          <div className="container mx-auto px-5 md:px-8 lg:px-16 relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-8 py-12 lg:py-16">
              <div className="flex-1 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 text-[12px] font-semibold" style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)" }}>
                  <Star size={12} fill="#FFCC00" stroke="none" />
                  Especialidade
                </div>
                <h1 className="text-3xl lg:text-4xl font-bold mb-4 leading-tight" style={{ color: "#fff", fontFamily: "Inter, sans-serif", letterSpacing: "-0.02em" }}>
                  {especialidade.nome}
                </h1>
                <p className="text-[16px] lg:text-[17px] leading-relaxed mb-6" style={{ color: "rgba(255,255,255,0.80)" }}>
                  {especialidade.introducao}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                  <button
                    onClick={handleSearchNearby}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-semibold text-[15px] min-h-[48px] transition-all border-0 cursor-pointer"
                    style={{ background: "#fff", color: "#0A2A66" }}
                  >
                    <Search size={18} />
                    Encontrar {especialidade.nome.toLowerCase()}
                  </button>
                </div>
              </div>
              <div className="flex-shrink-0 w-full max-w-[400px] lg:max-w-[360px]">
                <img
                  src={especialidade.heroImage}
                  alt={especialidade.nome}
                  className="w-full aspect-[2/1] object-cover rounded-2xl shadow-2xl"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Conteúdo principal */}
        <section className="py-12 lg:py-16" style={{ background: "#F2F2F7" }}>
          <div className="container mx-auto px-5 md:px-8 lg:px-16">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* Coluna principal */}
              <div className="lg:col-span-2 flex flex-col gap-8">

                {/* Tópicos detalhados */}
                {especialidade.topicos.map((topico, i) => (
                  <article key={i} className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
                    <h2 className="text-xl lg:text-2xl font-bold mb-4" style={{ color: "#0A2A66", fontFamily: "Inter, sans-serif" }}>
                      {topico.titulo}
                    </h2>
                    <p className="text-[15px] leading-relaxed" style={{ color: "#3A3A3C" }}>
                      {topico.texto}
                    </p>
                  </article>
                ))}

                {/* FAQ com Schema */}
                <section className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
                  <h2 className="text-xl lg:text-2xl font-bold mb-6" style={{ color: "#0A2A66", fontFamily: "Inter, sans-serif" }}>
                    Perguntas frequentes sobre {especialidade.nome.toLowerCase()}
                  </h2>
                  <div className="flex flex-col gap-4" itemScope itemType="https://schema.org/FAQPage">
                    {especialidade.faq.map((item, i) => (
                      <details key={i} className="group rounded-xl overflow-hidden" style={{ border: "0.5px solid rgba(60,60,67,0.12)" }} itemScope itemType="https://schema.org/Question" itemProp="mainEntity">
                        <summary
                          className="flex items-center justify-between px-5 py-4 text-[14px] font-semibold cursor-pointer list-none transition-colors"
                          style={{ color: "#0A2A66" }}
                        >
                          <span itemProp="name">{item.pergunta}</span>
                          <ChevronRight size={16} className="transition-transform group-open:rotate-90" style={{ color: "#8E8E93", flexShrink: 0 }} />
                        </summary>
                        <div className="px-5 pb-4" itemScope itemType="https://schema.org/Answer" itemProp="acceptedAnswer">
                          <p className="text-[14px] leading-relaxed" style={{ color: "#3A3A3C" }} itemProp="text">{item.resposta}</p>
                        </div>
                      </details>
                    ))}
                  </div>
                </section>
              </div>

              {/* Sidebar */}
              <aside className="flex flex-col gap-6">

                {/* Benefícios */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <h3 className="text-[16px] font-bold mb-4" style={{ color: "#0A2A66" }}>Benefícios</h3>
                  <ul className="flex flex-col gap-3">
                    {especialidade.beneficios.map((b, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[14px]" style={{ color: "#3A3A3C" }}>
                        <CheckCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: "#34C759" }} />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Links externos */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <h3 className="text-[16px] font-bold mb-4" style={{ color: "#0A2A66" }}>Links úteis</h3>
                  <ul className="flex flex-col gap-2.5">
                    {especialidade.linksExternos.map((link, i) => (
                      <li key={i}>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[14px] font-medium transition-colors hover:underline"
                          style={{ color: "#007AFF" }}
                        >
                          <ExternalLink size={14} />
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Top 5 Dentistas + CTA */}
                <div className="rounded-2xl p-6 text-left" style={{ background: "linear-gradient(135deg, #0A2A66 0%, #1a4b99 100%)" }}>
                  <MapPin size={22} className="mx-auto mb-2" style={{ color: "rgba(255,255,255,0.5)" }} />
                  <h3 className="text-[16px] font-bold text-center mb-3" style={{ color: "#fff" }}>Encontre perto de você</h3>

                  <button
                    onClick={handleSearchNearby}
                    className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl font-semibold text-[13px] min-h-[40px] transition-all mb-4"
                    style={{ background: "#fff", color: "#0A2A66" }}
                  >
                    <Navigation size={15} />
                    Encontre Dentistas perto de você
                  </button>

                  {topLoading && (
                    <div className="flex items-center justify-center py-4">
                      <div className="w-5 h-5 rounded-full border-2 border-transparent border-t-white animate-spin" style={{ borderRightColor: "rgba(255,255,255,0.3)", borderBottomColor: "rgba(255,255,255,0.3)" }} />
                    </div>
                  )}

                  {!topLoading && topDentistas.length === 0 && (
                    <p className="text-[12px] text-center" style={{ color: "rgba(255,255,255,0.6)" }}>
                      Nenhum profissional encontrado nesta região.
                    </p>
                  )}

                  {!topLoading && topDentistas.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>
                        Top {topDentistas.length} em {nome.toLowerCase()}
                      </p>
                      {topDentistas.map((d) => (
                        <Link
                          key={d.dentista_id}
                          to={`/dentista/${d.dentista_id}`}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all min-h-[52px]"
                          style={{ background: "rgba(255,255,255,0.10)" }}
                        >
                          <img
                            src={d.dentista_foto || "https://dsnzgxjuqlalysyfiion.supabase.co/storage/v1/object/public/fotos-dentistas/default-avatar.webp"}
                            alt={d.dentista_nome}
                            className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                            loading="lazy"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold truncate" style={{ color: "#fff" }}>
                              {d.dentista_nome}
                            </div>
                            <div className="flex items-center gap-1 text-[11px]" style={{ color: "rgba(255,255,255,0.65)" }}>
                              <Star size={11} fill="#FFCC00" stroke="#FFCC00" />
                              {d.dentista_avaliacao}
                              <span className="mx-1">·</span>
                              {d.endereco_cidade}, {d.endereco_estado}
                            </div>
                          </div>
                          <ChevronRight size={14} style={{ color: "rgba(255,255,255,0.4)", flexShrink: 0 }} />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </div>
        </section>

        {/* Outras especialidades */}
        <section className="py-12 lg:py-16 bg-white">
          <div className="container mx-auto px-5 md:px-8 lg:px-16">
            <h2 className="text-xl lg:text-2xl font-bold text-center mb-8" style={{ color: "#0A2A66", fontFamily: "Inter, sans-serif" }}>
              Outras especialidades
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {ESPECIALIDADES.filter(e => e !== nome).slice(0, 8).map((label) => {
                const seo = ESPECIALIDADES_SEO[label];
                return (
                  <Link
                    key={label}
                    to={`/especialidade/${seo?.slug || label.toLowerCase().replace(/\s+/g, "-")}`}
                    className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-[14px] font-medium transition-all min-h-[48px]"
                    style={{ background: "rgba(60,60,67,0.04)", color: "#3A3A3C" }}
                  >
                    <ChevronRight size={14} style={{ color: "#007AFF" }} />
                    {label}
                  </Link>
                );
              })}
            </div>
            <div className="text-center mt-6">
              <Link
                to="/#especialidades"
                className="inline-flex items-center gap-1 text-[14px] font-semibold transition-colors"
                style={{ color: "#007AFF" }}
              >
                Ver todas as especialidades
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {showLoginModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowLoginModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-2" style={{ color: "#0A2A66" }}>
              Login necessário
            </h3>
            <p className="text-sm mb-4" style={{ color: "#3A3A3C" }}>
              Faça login com sua conta Google para buscar dentistas.
            </p>
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-[14px] border transition-all"
              style={{ border: "1px solid #D1D5DB", color: "#1F2937" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continuar com Google
            </button>
            <button
              onClick={() => setShowLoginModal(false)}
              className="w-full text-center text-[13px] mt-3 transition-colors"
              style={{ color: "#8E8E93" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
