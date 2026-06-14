// ═══════════════════════════════════════════════════════════════════════════════
// EDGE FUNCTION: lista-envio-campanha
//
// Monta a lista de envio de uma campanha de e-mail marketing: devolve os
// destinatários (email + token de descadastro) dos dentistas ATIVOS que deram
// opt-in na categoria indicada. O envio em si é feito pelo script local
// (enviar_email_marketing.mjs), que injeta o token no link de descadastro.
//
// Segurança: exige header x-cron-secret == app_config('cron_secret'). Usa a
// service_role key para chamar a RPC privilegiada lista_envio_campanha (a lista
// contém e-mails + tokens — nunca exposta a anon/authenticated).
//
// Request:  POST { "categoria": "novidades" | "desempenho" | "parceiros" }
// Response: { ok, categoria, total, destinatarios: [{ email, token }] }
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CATEGORIAS = ["desempenho", "novidades", "parceiros"];

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  // ─── Autorização: somente quem tem o segredo (app_config) ──────────────────
  const { data: cfg } = await supabase
    .from("app_config").select("valor").eq("chave", "cron_secret").maybeSingle();
  const segredoEsperado = cfg?.valor;
  const secret = req.headers.get("x-cron-secret");
  if (!segredoEsperado || secret !== segredoEsperado) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { categoria = "novidades" } = await req.json().catch(() => ({}));
    if (!CATEGORIAS.includes(categoria)) {
      return new Response(JSON.stringify({ error: "categoria inválida", validas: CATEGORIAS }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase.rpc("lista_envio_campanha", { p_categoria: categoria });
    if (error) throw error;

    const destinatarios = (data ?? []).map((r: { email: string; token: string }) => ({
      email: r.email, token: r.token,
    }));

    return new Response(
      JSON.stringify({ ok: true, categoria, total: destinatarios.length, destinatarios }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[lista-envio-campanha] Erro:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});
