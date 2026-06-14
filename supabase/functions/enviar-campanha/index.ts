// ═══════════════════════════════════════════════════════════════════════════════
// EDGE FUNCTION: enviar-campanha
//
// Envia o e-mail marketing via Resend (chave server-side). Faz o envio do lado do
// servidor — o gatilho local (script) não precisa da RESEND_API_KEY, só do segredo.
//
// Segurança: exige x-cron-secret == app_config('cron_secret').
// Reescreve {{UNSUB_TOKEN}} (link de descadastro) e, com assetBase, as imagens
// relativas para URL absoluta.
//
// Request (POST):
//   { test: "email", html, subject?, assetBase?, token? }      -> 1 e-mail de teste
//   { categoria: "novidades", html, subject?, assetBase?, send? } -> lista opt-in
//        (sem send=true é dry-run: só conta; com send=true envia a cada um)
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FROM = "Equipe CuraDentes <do-not-reply@curadentes.com.br>";
const SUBJECT_PADRAO = "O CuraDentes Pro chegou — e você faz parte do começo 🦷";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  const RESEND = Deno.env.get("RESEND_API_KEY");

  const { data: cfg } = await supabase
    .from("app_config").select("valor").eq("chave", "cron_secret").maybeSingle();
  const secret = req.headers.get("x-cron-secret");
  if (!cfg?.valor || secret !== cfg.valor) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
  }

  try {
    const { test, categoria, html, subject, assetBase, token, send } = await req.json();
    if (!html) return json({ error: "html obrigatório" }, 400);
    const subj = subject || SUBJECT_PADRAO;

    const prep = (token: string) => {
      let out = String(html).replace(/\{\{UNSUB_TOKEN\}\}/g, token || "");
      if (assetBase) {
        const base = String(assetBase).replace(/\/$/, "");
        out = out.replace(/src="(?!https?:|data:|cid:)([^"]+)"/g, (_m, p) => `src="${base}/${p.replace(/^\.?\//, "")}"`);
      }
      return out;
    };

    const enviar = async (to: string, tk: string) => {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${RESEND}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM, to, subject: subj, html: prep(tk) }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(body));
      return body;
    };

    if (test) {
      const r = await enviar(test, token || "");
      return json({ ok: true, modo: "teste", to: test, id: r.id });
    }

    if (categoria) {
      const { data, error } = await supabase.rpc("lista_envio_campanha", { p_categoria: categoria });
      if (error) throw error;
      const lista = (data ?? []) as { email: string; token: string }[];
      if (!send) return json({ ok: true, modo: "dry-run", categoria, total: lista.length });
      let ok = 0, fail = 0;
      for (const d of lista) {
        try { await enviar(d.email, d.token); ok++; } catch (e) { fail++; console.error("falha", d.email, e); }
      }
      return json({ ok: true, modo: "envio", categoria, enviados: ok, falhas: fail });
    }

    return json({ error: "informe 'test' ou 'categoria'" }, 400);
  } catch (err) {
    console.error("[enviar-campanha] Erro:", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}
