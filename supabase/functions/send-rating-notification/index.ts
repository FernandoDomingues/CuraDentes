// ═══════════════════════════════════════════════════════════════════════════════
// EDGE FUNCTION: send-rating-notification
//
// Notifica o dentista por email quando recebe uma avaliacao.
//
// SEGURANCA (#2 da auditoria): exige um USUARIO autenticado de verdade — nao
// basta a anon key. Sem isso, qualquer um com a chave publica podia disparar
// emails arbitrarios pelo dominio (spam/phishing) e queimar creditos do Resend.
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface Payload {
  dentistEmail: string;
  dentistName: string;
  specialty: string;
  patientName: string;
}

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    // Reflete a origem da requisicao (evita o curinga "*" cego) + Vary
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

serve(async (req) => {
  const cors = corsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: cors });
  }

  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    // ─── Exige usuario autenticado de verdade (nao apenas a anon key) ──────────
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return json({ error: "Nao autorizado: e necessario estar logado." }, 401);
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY nao configurada nas secrets do projeto");
    }

    const { dentistEmail, dentistName, specialty, patientName }: Payload = await req.json();
    if (!dentistEmail) {
      throw new Error("Dentista sem email cadastrado");
    }

    const html = `
      <h1>Parabens doutor ${dentistName}</h1>
      <p>Voce acabou de receber uma avaliacao pelo seu atendimento de ${specialty} do cliente ${patientName}</p>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "CuraDentes <do-not-reply@curadentes.com.br>",
        to: dentistEmail,
        subject: "Nova avaliacao recebida!",
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend error:", err);
      return json({ error: err }, 500);
    }

    return json({ ok: true }, 200);
  } catch (err) {
    console.error("Erro ao processar:", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
