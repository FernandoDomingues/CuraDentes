import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface Payload {
  dentistEmail: string;
  dentistName: string;
  specialty: string;
  patientName: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY não configurada nas secrets do projeto");
    }

    const { dentistEmail, dentistName, specialty, patientName }: Payload = await req.json();

    if (!dentistEmail) {
      throw new Error("Dentista sem email cadastrado");
    }

    const html = `
      <h1>Parabéns doutor ${dentistName}</h1>
      <p>Você acabou de receber uma avaliação pelo seu atendimento de ${specialty} do cliente ${patientName}</p>
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
        subject: "Nova avaliação recebida!",
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend error:", err);
      return new Response(JSON.stringify({ error: err }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Erro ao processar:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
