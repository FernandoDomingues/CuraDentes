// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA: Preferências de e-mail / Descadastro (/descadastro?token=...)
//
// Acessada pelo link "Cancelar inscrição" dos e-mails, SEM login. Identifica o
// dentista pelo token (capacidade) e permite ajustar/cancelar as categorias.
// Lê e grava só via RPCs SECURITY DEFINER gated por token — a tabela e o token
// não são expostos diretamente.
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, MailX, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import logoComNome from "@/assets/logos/logo-com-nome.png";

type Prefs = { desempenho: boolean; novidades: boolean; parceiros: boolean };

const CATEGORIAS: { key: keyof Prefs; titulo: string; desc: string }[] = [
  { key: "desempenho", titulo: "Desempenho do meu perfil", desc: "Resumos de visualizações, contatos e novas avaliações." },
  { key: "novidades", titulo: "Novidades e dicas", desc: "Novos recursos, dicas para atrair pacientes e ofertas do CuraDentes." },
  { key: "parceiros", titulo: "Ofertas de parceiros", desc: "Comunicações de empresas parceiras selecionadas." },
];

export default function PreferenciasEmail() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";

  const [carregando, setCarregando] = useState(true);
  const [invalido, setInvalido] = useState(false);
  const [nome, setNome] = useState("");
  const [prefs, setPrefs] = useState<Prefs>({ desempenho: false, novidades: false, parceiros: false });
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  // Confirmação antes de aplicar (a mudança só vale após o clique "Confirmar")
  const [pendente, setPendente] = useState<{ prefs: Prefs; tipo: "salvar" | "cancelar" } | null>(null);

  useEffect(() => {
    async function carregar() {
      if (!token) { setInvalido(true); setCarregando(false); return; }
      const { data, error } = await supabase.rpc("email_prefs_por_token", { p_token: token });
      const row = Array.isArray(data) ? data[0] : data;
      if (error || !row) { setInvalido(true); setCarregando(false); return; }
      setNome(row.nome || "");
      const p = (row.prefs || {}) as Partial<Prefs>;
      setPrefs({ desempenho: !!p.desempenho, novidades: !!p.novidades, parceiros: !!p.parceiros });
      setCarregando(false);
    }
    carregar();
  }, [token]);

  async function salvar(novas: Prefs) {
    setSalvando(true);
    setSalvo(false);
    const { data, error } = await supabase.rpc("atualizar_email_prefs_por_token", { p_token: token, p_prefs: novas });
    setSalvando(false);
    if (!error && data === true) { setPrefs(novas); setSalvo(true); }
  }

  async function confirmar() {
    if (!pendente) return;
    await salvar(pendente.prefs);
    setPendente(null);
  }

  const toggle = (key: keyof Prefs) => { setSalvo(false); setPrefs((p) => ({ ...p, [key]: !p[key] })); };

  return (
    <div className="min-h-screen flex flex-col items-center px-5 py-10" style={{ background: "linear-gradient(160deg,#E3F2FD 0%,#FFFFFF 60%)" }}>
      <a href="/"><img src={logoComNome} alt="CuraDentes" className="h-9 w-auto mb-8" /></a>

      <div className="w-full max-w-[480px] bg-white rounded-[20px] p-6 md:p-8" style={{ border: "0.5px solid rgba(60,60,67,0.10)", boxShadow: "0 8px 32px rgba(16,24,64,0.08)" }}>
        {carregando ? (
          <div className="flex items-center justify-center gap-2 py-10" style={{ color: "#8E8E93" }}>
            <Loader2 size={18} className="animate-spin" /> Carregando suas preferências…
          </div>
        ) : invalido ? (
          <div className="text-center py-6">
            <MailX size={36} className="mx-auto mb-3" style={{ color: "#FF9500" }} />
            <h1 className="text-[20px] font-bold mb-2" style={{ color: "#0A2A66" }}>Link inválido ou expirado</h1>
            <p className="text-[14px]" style={{ color: "#8E8E93", lineHeight: 1.6 }}>
              Não conseguimos identificar sua conta por este link. Abra o link diretamente de um e-mail
              recente do CuraDentes, ou gerencie suas preferências entrando na sua conta.
            </p>
            <a href="/" className="inline-block mt-5 text-[14px] font-semibold underline" style={{ color: "#007AFF" }}>Ir para a home</a>
          </div>
        ) : (
          <>
            <h1 className="text-[22px] font-bold mb-1" style={{ color: "#0A2A66" }}>Preferências de e-mail</h1>
            <p className="text-[14px] mb-5" style={{ color: "#8E8E93" }}>
              {nome ? `Olá, ${nome}. ` : ""}Escolha o que você quer receber do CuraDentes.
            </p>

            <div className="flex flex-col gap-2 mb-5">
              {CATEGORIAS.map((c) => (
                <label key={c.key} className="flex items-start gap-3 cursor-pointer p-3 rounded-[12px]"
                  style={{ border: prefs[c.key] ? "1px solid rgba(0,122,255,0.30)" : "1px solid rgba(60,60,67,0.12)", background: prefs[c.key] ? "rgba(0,122,255,0.04)" : "rgba(60,60,67,0.02)" }}>
                  <input type="checkbox" checked={prefs[c.key]} onChange={() => toggle(c.key)}
                    className="mt-0.5 w-5 h-5 accent-[#007AFF] cursor-pointer flex-shrink-0" />
                  <span style={{ lineHeight: 1.4 }}>
                    <span className="text-[14px] font-medium block" style={{ color: "#1C1C1E" }}>{c.titulo}</span>
                    <span className="text-[12px]" style={{ color: "#8E8E93" }}>{c.desc}</span>
                  </span>
                </label>
              ))}
            </div>

            <button onClick={() => setPendente({ prefs, tipo: "salvar" })} disabled={salvando}
              className="w-full py-3 rounded-[14px] text-[15px] font-semibold text-white transition-opacity"
              style={{ background: "#007AFF", opacity: salvando ? 0.6 : 1, cursor: salvando ? "not-allowed" : "pointer" }}>
              Salvar preferências
            </button>

            {salvo && (
              <p className="flex items-center justify-center gap-1.5 text-[13px] font-medium mt-3" style={{ color: "#34C759" }}>
                <Check size={15} /> Preferências salvas com sucesso.
              </p>
            )}

            <div className="mt-5 pt-4" style={{ borderTop: "1px solid rgba(60,60,67,0.10)" }}>
              <button onClick={() => setPendente({ prefs: { desempenho: false, novidades: false, parceiros: false }, tipo: "cancelar" })} disabled={salvando}
                className="w-full text-[13px] font-medium" style={{ color: "#FF3B30", cursor: salvando ? "not-allowed" : "pointer" }}>
                Cancelar todos os e-mails promocionais
              </button>
              <p className="text-[11px] text-center mt-3" style={{ color: "#B0BDD0", lineHeight: 1.5 }}>
                E-mails essenciais (conta, segurança e avisos do serviço) continuam sendo enviados,
                conforme nossos Termos de Uso.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Confirmação — a mudança só é aplicada aqui */}
      {pendente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: "rgba(11,28,48,0.45)" }}>
          <div className="w-full max-w-[380px] bg-white rounded-[18px] p-6 text-center" style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.2)" }}>
            <h2 className="text-[18px] font-bold mb-2" style={{ color: "#0A2A66" }}>
              {pendente.tipo === "cancelar" ? "Cancelar todos os e-mails promocionais?" : "Confirmar suas preferências?"}
            </h2>
            <p className="text-[13px] mb-5" style={{ color: "#8E8E93", lineHeight: 1.6 }}>
              {pendente.tipo === "cancelar"
                ? "Você deixará de receber e-mails de desempenho, novidades e ofertas. E-mails essenciais (conta, segurança e serviço) continuam."
                : "Vamos atualizar quais e-mails você recebe conforme as opções marcadas."}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setPendente(null)} disabled={salvando}
                className="flex-1 py-2.5 rounded-[12px] text-[14px] font-semibold"
                style={{ background: "rgba(60,60,67,0.08)", color: "#3A3A3C", cursor: salvando ? "not-allowed" : "pointer" }}>
                Voltar
              </button>
              <button onClick={confirmar} disabled={salvando}
                className="flex-1 py-2.5 rounded-[12px] text-[14px] font-semibold text-white"
                style={{ background: pendente.tipo === "cancelar" ? "#FF3B30" : "#007AFF", opacity: salvando ? 0.6 : 1, cursor: salvando ? "not-allowed" : "pointer" }}>
                {salvando ? "Salvando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
