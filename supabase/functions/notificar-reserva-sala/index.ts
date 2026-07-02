// Deno / Supabase Edge Function — e-mails da LOCAÇÃO DE SALAS (HTML na identidade Pro).
// Recebe { tipo, solicitacao_id }:
//   nova      → avisa o ANFITRIÃO (recebeu um pedido) + confirma ao LOCATÁRIO (pedido enviado)
//   aprovada  → avisa o LOCATÁRIO (aprovado; contato liberado no painel)
//   recusada  → avisa o LOCATÁRIO (não aprovado)
// NÃO coloca PII de contato (telefone/e-mail) no corpo — a revelação continua só no painel.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE = Deno.env.get("SITE_URL") ?? "https://www.curadentes.com.br";

// ─── Escapa texto dinâmico (nomes, títulos) para não quebrar o HTML ───────────────
function esc(s: string | null | undefined): string {
  return (s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!),
  );
}

interface Detalhe { rotulo: string; valor: string; }

// ─── Casca do e-mail (tabelas email-safe, paleta CuraDentes Pro) ──────────────────
function layout(p: {
  eyebrow: string;
  titulo: string;
  intro: string;
  detalhes: Detalhe[];
  ctaLabel: string;
  ctaUrl: string;
  rodapeNota?: string;
}): string {
  const linhas = p.detalhes
    .map(
      (d) => `
      <tr>
        <td style="padding:4px 0; font-family:Arial,Helvetica,sans-serif; font-size:13px; color:#5c6b7a; width:96px; vertical-align:top;">${esc(d.rotulo)}</td>
        <td style="padding:4px 0; font-family:Arial,Helvetica,sans-serif; font-size:14px; color:#0b1c30; font-weight:bold;">${esc(d.valor)}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="color-scheme" content="only light"/>
  <meta name="supported-color-schemes" content="only light"/>
  <title>CuraDentes Pro</title>
  <style>
    :root{ color-scheme: only light; } body{ color-scheme: only light; }
    body,table,td,a{ -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table,td{ mso-table-lspace:0pt; mso-table-rspace:0pt; }
    body{ margin:0; padding:0; width:100% !important; background:#f4f6fc; }
    a{ color:#b50048; }
    @media only screen and (max-width:620px){ .container{ width:100% !important; } .px{ padding-left:24px !important; padding-right:24px !important; } }
  </style>
</head>
<body style="margin:0; padding:0; background:#f4f6fc;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:#f4f6fc; font-size:1px; line-height:1px;">${esc(p.intro)}</div>
  <table role="presentation" bgcolor="#f4f6fc" width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#f4f6fc;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" class="container" width="600" border="0" cellspacing="0" cellpadding="0" style="width:600px; max-width:600px; background:#ffffff; border-radius:20px; overflow:hidden;">

        <!-- HEADER -->
        <tr><td bgcolor="#b50048" class="px" style="background:#b50048; padding:26px 40px; font-family:Arial,Helvetica,sans-serif;">
          <div style="font-size:19px; font-weight:bold; color:#ffffff; letter-spacing:-0.2px;">CuraDentes Pro</div>
          <div style="font-size:11px; font-weight:bold; color:#ffd9e2; letter-spacing:1px; padding-top:3px;">LOCA&Ccedil;&Atilde;O DE SALAS</div>
        </td></tr>

        <!-- CORPO -->
        <tr><td class="px" style="padding:34px 40px 8px; font-family:Arial,Helvetica,sans-serif;">
          <div style="font-size:12px; font-weight:bold; color:#b50048; letter-spacing:1px; text-transform:uppercase; margin-bottom:8px;">${esc(p.eyebrow)}</div>
          <h1 style="margin:0 0 12px; font-size:23px; line-height:1.3; color:#0b1c30;">${esc(p.titulo)}</h1>
          <p style="margin:0 0 20px; font-size:15px; line-height:1.65; color:#3a4f68;">${esc(p.intro)}</p>
        </td></tr>

        <!-- DETALHES -->
        <tr><td class="px" style="padding:0 40px 22px; font-family:Arial,Helvetica,sans-serif;">
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#eff4ff" style="background:#eff4ff; border-radius:14px;">
            <tr><td style="padding:16px 20px; border-left:3px solid #465c99;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0">${linhas}</table>
            </td></tr>
          </table>
        </td></tr>

        <!-- CTA -->
        <tr><td class="px" align="center" style="padding:0 40px 34px; font-family:Arial,Helvetica,sans-serif;">
          <table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center"><tr>
            <td bgcolor="#b50048" align="center" style="background:#b50048; border-radius:999px;">
              <a href="${p.ctaUrl}" style="display:inline-block; padding:14px 32px; font-family:Arial,Helvetica,sans-serif; font-size:16px; font-weight:bold; color:#ffffff; text-decoration:none;">${esc(p.ctaLabel)}</a>
            </td>
          </tr></table>
          ${p.rodapeNota ? `<p style="margin:16px 0 0; font-size:13px; line-height:1.6; color:#5c6b7a;">${esc(p.rodapeNota)}</p>` : ""}
        </td></tr>

        <!-- FOOTER -->
        <tr><td bgcolor="#f8f9ff" class="px" align="center" style="background:#f8f9ff; border-top:1px solid #dce9ff; padding:24px 40px 28px; font-family:Arial,Helvetica,sans-serif;">
          <div style="font-size:13px; font-weight:bold; color:#0b1c30; margin-bottom:4px;">CuraDentes Pro</div>
          <p style="margin:0 0 12px; font-size:12px; line-height:1.6; color:#906e73;">Conectando sorrisos ao cuidado certo &middot; Locação de Salas para dentistas verificados.</p>
          <p style="margin:0 0 10px; font-size:12px;">
            <a href="${SITE}/privacidade" style="color:#b50048; text-decoration:none; font-weight:bold;">Privacidade</a>
            &nbsp;&middot;&nbsp;
            <a href="${SITE}/termos" style="color:#b50048; text-decoration:none; font-weight:bold;">Termos de Uso</a>
          </p>
          <p style="margin:0; font-size:11px; color:#b0bdd0;">&copy; 2026 CuraDentes Pro &middot; Todos os direitos reservados</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  try {
    const { tipo, solicitacao_id } = await req.json();
    if (!solicitacao_id || !["nova", "aprovada", "recusada", "pagamento"].includes(tipo)) {
      return new Response("payload invalido", { status: 400 });
    }

    // service-role: ignora RLS só para LER os e-mails das partes (server-only, seguro).
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: sol } = await sb
      .from("solicitacoes_reserva")
      .select("anfitriao_id, locatario_id, data, hora_inicio, hora_fim, sala:salas(titulo, nome_clinica)")
      .eq("id", solicitacao_id)
      .maybeSingle();
    if (!sol) return new Response("solicitacao inexistente", { status: 404 });

    const salaObj = (Array.isArray(sol.sala) ? sol.sala[0] : sol.sala) as { titulo?: string; nome_clinica?: string } | null;
    const titulo = salaObj?.titulo ?? "Sala";
    const clinica = salaObj?.nome_clinica ?? "";
    const quando = `${String(sol.data).split("-").reverse().join("/")}, ${sol.hora_inicio}–${sol.hora_fim}`;

    const [{ data: anf }, { data: loc }] = await Promise.all([
      sb.from("curadentespro").select("nome, email").eq("id", sol.anfitriao_id).maybeSingle(),
      sb.from("curadentespro").select("nome, email").eq("id", sol.locatario_id).maybeSingle(),
    ]);

    const primeiro = (n?: string | null) => (n ? n.split(" ")[0] : "");
    const det: Detalhe[] = [
      { rotulo: "Sala", valor: titulo },
      ...(clinica ? [{ rotulo: "Clínica", valor: clinica }] : []),
      { rotulo: "Quando", valor: quando },
    ];

    if (tipo === "nova") {
      // 1) Anfitrião: recebeu um pedido.
      if (anf?.email) {
        await enviar(anf.email, `Novo pedido de reserva — ${titulo}`, layout({
          eyebrow: "Novo pedido",
          titulo: `${primeiro(loc?.nome) || "Um dentista"} quer alugar sua sala 🗓️`,
          intro: `Você recebeu um pedido de reserva${clinica ? ` na clínica ${clinica}` : ""}. Aprove ou recuse pelo painel — o contato do dentista fica disponível lá.`,
          detalhes: [{ rotulo: "Dentista", valor: loc?.nome ?? "Dentista" }, ...det],
          ctaLabel: "Ver o pedido",
          ctaUrl: `${SITE}/pro/negocios?aba=recebidas`,
          rodapeNota: "Você decide se aprova. O acerto de pagamento é combinado direto com o dentista após a aprovação.",
        }));
      }
      // 2) Locatário: confirmação do envio.
      if (loc?.email) {
        await enviar(loc.email, `Pedido de reserva enviado — ${titulo}`, layout({
          eyebrow: "Pedido enviado",
          titulo: "Recebemos o seu pedido ✅",
          intro: `Enviamos o seu pedido${clinica ? ` para a clínica ${clinica}` : ""}. Assim que ela aprovar ou recusar, avisamos você. O contato da clínica é liberado após a aprovação.`,
          detalhes: det,
          ctaLabel: "Acompanhar meu pedido",
          ctaUrl: `${SITE}/pro/negocios?aba=enviadas`,
        }));
      }
    } else if (tipo === "aprovada") {
      if (loc?.email) {
        await enviar(loc.email, `Reserva aprovada — pagamento pendente — ${titulo}`, layout({
          eyebrow: "Pedido aprovado",
          titulo: "Boa notícia! Seu pedido foi aprovado 🎉",
          intro: `${clinica ? `A clínica ${clinica}` : "A clínica"} aprovou o seu horário. Agora combine e realize o PAGAMENTO das horas contratadas direto com a clínica — o contato dela está no painel. Assim que a clínica confirmar o recebimento, avisamos você.`,
          detalhes: det,
          ctaLabel: "Ver contato da clínica",
          ctaUrl: `${SITE}/pro/negocios?aba=enviadas`,
          rodapeNota: "⏳ Pagamento pendente: o acerto é direto com a clínica, fora da plataforma.",
        }));
      }
    } else if (tipo === "pagamento") {
      if (loc?.email) {
        await enviar(loc.email, `Pagamento confirmado — ${titulo}`, layout({
          eyebrow: "Pagamento confirmado",
          titulo: "Pagamento confirmado pela clínica ✅",
          intro: `${clinica ? `A clínica ${clinica}` : "A clínica"} confirmou o recebimento do pagamento da sua reserva. Está tudo certo — bom atendimento!`,
          detalhes: det,
          ctaLabel: "Ver minha reserva",
          ctaUrl: `${SITE}/pro/negocios?aba=enviadas`,
        }));
      }
    } else if (tipo === "recusada") {
      if (loc?.email) {
        await enviar(loc.email, `Pedido de reserva não aprovado — ${titulo}`, layout({
          eyebrow: "Pedido não aprovado",
          titulo: "Seu pedido não foi aprovado",
          intro: `${clinica ? `A clínica ${clinica}` : "A clínica"} não pôde aceitar este horário desta vez. Há outras salas disponíveis para o seu atendimento.`,
          detalhes: det,
          ctaLabel: "Procurar outra sala",
          ctaUrl: `${SITE}/coworking`,
        }));
      }
    }

    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("[notificar-reserva-sala]", e);
    return new Response("erro", { status: 500 });
  }
});

// ─── Resend (mesmo provedor do projeto) ──────────────────────────────────────────
async function enviar(para: string, assunto: string, html: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return; // sem chave: no-op (o painel continua sendo a fonte da verdade)
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: Deno.env.get("EMAIL_REMETENTE") ?? "CuraDentes <no-reply@curadentes.com.br>",
      to: para,
      subject: assunto,
      html,
    }),
  });
}
