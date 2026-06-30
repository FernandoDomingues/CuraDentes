// Deno / Supabase Edge Function. Recebe { endereco_id } e avisa o DONO da clínica
// que um novo dentista pediu adesão àquele endereço. Não coloca PII no corpo:
// manda o dono abrir /pro/adesoes para aprovar ou recusar.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE = Deno.env.get("SITE_URL") ?? "https://www.curadentes.com.br";

Deno.serve(async (req) => {
  try {
    const { endereco_id } = await req.json();
    if (!endereco_id) return new Response("payload invalido", { status: 400 });

    // service-role: ignora RLS só para LER o e-mail do dono (server-only, seguro).
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1) pedido pendente daquele endereço → clinica_key + quem solicitou
    const { data: adesao } = await sb
      .from("clinica_adesoes")
      .select("clinica_key, solicitante_id")
      .eq("endereco_id", endereco_id)
      .eq("status", "pendente")
      .order("criada_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!adesao) return new Response("sem adesao pendente", { status: 200 });

    // 2) dono da clínica (clinica_key → dono_id)
    const { data: dono } = await sb
      .from("clinicas_donos")
      .select("dono_id")
      .eq("clinica_key", adesao.clinica_key)
      .maybeSingle();
    if (!dono?.dono_id) return new Response("sem dono", { status: 200 });

    // 3) e-mail/nome do dono + nome do solicitante + nome da clínica (no endereço)
    const [{ data: donoRow }, { data: solRow }, { data: endRow }] = await Promise.all([
      sb.from("curadentespro").select("nome, email").eq("id", dono.dono_id).maybeSingle(),
      sb.from("curadentespro").select("nome").eq("id", adesao.solicitante_id).maybeSingle(),
      sb.from("curadentespro_enderecos").select("nome_clinica").eq("id", endereco_id).maybeSingle(),
    ]);
    if (!donoRow?.email) return new Response("sem email do dono", { status: 200 });

    const clinica = endRow?.nome_clinica ?? "sua clínica";
    const solicitante = solRow?.nome ?? "Um dentista";
    const ola = donoRow.nome ? `Olá, ${donoRow.nome}!` : "Olá!";

    const assunto = `Novo pedido de adesão à clínica "${clinica}"`;
    const corpo =
      `${ola}\n\n` +
      `${solicitante} se cadastrou no mesmo endereço da clínica "${clinica}" e ` +
      `pediu para fazer parte dela no CuraDentes.\n\n` +
      `Enquanto você não decidir, o endereço desse dentista fica oculto.\n` +
      `Aprove ou recuse em: ${SITE}/pro/adesoes\n\n` +
      `— Equipe CuraDentes`;

    await enviarEmail(donoRow.email, assunto, corpo);
    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("[notificar-adesao-clinica]", e);
    return new Response("erro", { status: 500 });
  }
});

// ─── Resend (mesmo provedor do projeto) ──────────────────────────────────────────
async function enviarEmail(para: string, assunto: string, texto: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return; // sem chave: no-op (o painel /pro/adesoes continua sendo a fonte da verdade)
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: Deno.env.get("EMAIL_REMETENTE") ?? "CuraDentes <no-reply@curadentes.com.br>",
      to: para,
      subject: assunto,
      text: texto,
    }),
  });
}
