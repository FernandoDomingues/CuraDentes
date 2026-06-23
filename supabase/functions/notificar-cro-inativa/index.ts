// ═══════════════════════════════════════════════════════════════════════════════
// EDGE FUNCTION: notificar-cro-inativa
//
// Avisa o dentista, por e-mail, que o perfil dele foi DESATIVADO porque o CRO não
// pôde ser confirmado como ativo/regular na verificação (consulta ao Conselho).
// O perfil já é ocultado no banco pela RPC marcar_verificacao_cro (deleted_at);
// esta função apenas dispara o e-mail oficial de suporte@curadentes.com.br.
//
// Segurança: SOMENTE o superuser pode chamar. Validamos o JWT do chamador via
// rpc('is_superuser') (mesma fonte de verdade do resto do sistema).
//
// Request (POST): { email, nome, cro }
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const FROM = "Suporte CuraDentes <suporte@curadentes.com.br>";
const SUBJECT = "Seu perfil no CuraDentes está temporariamente inativo";
const TEMPLATE_URL = "https://www.curadentes.com.br/email/cro-inativa.html";

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Escapa o mínimo para não quebrar o HTML ao injetar nome/CRO.
function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const RESEND = Deno.env.get("RESEND_API_KEY");
  if (!RESEND) return json({ error: "RESEND_API_KEY ausente no ambiente" }, 500);

  // ── Autorização: só o superuser (valida o JWT do chamador) ──────────────────
  const auth = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: auth } } },
  );
  const { data: isSuper, error: authErr } = await supabase.rpc("is_superuser");
  if (authErr || !isSuper) {
    return json({ error: "Não autorizado: apenas o administrador pode notificar." }, 403);
  }

  try {
    const { email, nome, cro } = await req.json();
    if (!email) return json({ error: "email obrigatório" }, 400);

    // Template hospedado no próprio site (fonte única de verdade do design).
    const resp = await fetch(TEMPLATE_URL, { cache: "no-store" });
    if (!resp.ok) return json({ error: `Falha ao carregar template (${resp.status})` }, 502);
    let html = await resp.text();
    html = html
      .replace(/\{\{NOME\}\}/g, esc(nome) || "dentista")
      .replace(/\{\{CRO\}\}/g, esc(cro) || "informado no cadastro");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: email, subject: SUBJECT, html }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return json({ error: "Resend falhou", detalhe: body }, 502);

    return json({ ok: true, id: body.id, to: email });
  } catch (err) {
    console.error("[notificar-cro-inativa] Erro:", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
