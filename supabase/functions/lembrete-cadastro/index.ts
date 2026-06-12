// ═══════════════════════════════════════════════════════════════════════════════
// EDGE FUNCTION: lembrete-cadastro
//
// Disparada por cron (pg_cron) a cada poucos minutos. Procura dentistas que
// começaram o cadastro e ainda não concluíram (lgpd_aceito=false) e aplica uma
// RÉGUA DE REATIVAÇÃO escalonada com base na idade do cadastro (criado_em):
//
//   etapa 1 -> 20 minutos    : lembrete das pendências
//   etapa 2 -> 1 dia         : lembrete
//   etapa 3 -> 1 semana      : lembrete
//   etapa 4 -> 1 mês         : último lembrete
//   etapa 5 -> 1 mês + 1 dia : email de exclusão; o pré-cadastro (perfil + login)
//                              é APAGADO -> para entrar terá que recomeçar do zero.
//
// A coluna lembrete_etapa guarda a maior etapa já enviada (evita reenvio). A cada
// disparo, calculamos a etapa devida pela idade; se for maior que a registrada,
// enviamos só essa (a mais recente) e avançamos a etapa.
//
// Segurança: exige header x-cron-secret == app_config('cron_secret') (só o cron
// dispara). Usa a service_role key para ler/atualizar/apagar (bypass de RLS) e a
// admin API para apagar a conta de login.
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = "https://curadentes.com.br";
const MIN = 60 * 1000;
const DIA = 24 * 60 * MIN;

// Limiares (idade do cadastro) de cada etapa.
const LIMIARES = [
  { etapa: 1, ms: 20 * MIN },
  { etapa: 2, ms: 1 * DIA },
  { etapa: 3, ms: 7 * DIA },
  { etapa: 4, ms: 30 * DIA },
  { etapa: 5, ms: 31 * DIA }, // 1 mês + 1 dia -> exclusão
];

function etapaDevida(ageMs: number): number {
  let etapa = 0;
  for (const l of LIMIARES) if (ageMs >= l.ms) etapa = l.etapa;
  return etapa;
}

// Texto (assunto + abertura) de cada etapa de lembrete (1..4).
function textoLembrete(etapa: number): { subject: string; abertura: string } {
  switch (etapa) {
    case 1:
      return {
        subject: "Conclua seu cadastro e apareça para os pacientes 🦷",
        abertura:
          "Você começou seu cadastro na <strong>CuraDentes</strong>, mas ele ainda não foi concluído — por isso seu perfil <strong>ainda não aparece</strong> para os pacientes que buscam dentistas.",
      };
    case 2:
      return {
        subject: "Ainda dá tempo de concluir seu cadastro 🦷",
        abertura:
          "Já faz um dia que você começou seu cadastro na <strong>CuraDentes</strong> e ele continua incompleto. Enquanto isso, seu perfil <strong>não aparece</strong> nas buscas dos pacientes.",
      };
    case 3:
      return {
        subject: "Seu perfil ainda não está no ar — faltam poucos passos",
        abertura:
          "Já faz uma semana que seu cadastro na <strong>CuraDentes</strong> ficou pela metade. Seu perfil <strong>continua invisível</strong> para os pacientes até você concluir.",
      };
    case 4:
      return {
        subject: "Último lembrete: seu cadastro está prestes a expirar ⏳",
        abertura:
          "Seu cadastro na <strong>CuraDentes</strong> está incompleto há quase um mês. Este é o <strong>último lembrete</strong>: se não for concluído, em breve o pré-cadastro será removido e você terá que começar do zero.",
      };
    default:
      return { subject: "", abertura: "" };
  }
}

function htmlLembrete(nome: string | null, abertura: string, itens: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1C1C1E;">
      <h2 style="color: #0A6E5C; margin-bottom: 4px;">CuraDentes</h2>
      <p>Olá${nome ? `, ${nome}` : ""}!</p>
      <p>${abertura}</p>
      <p>Faltam apenas estes itens:</p>
      <ul style="padding-left: 20px;">${itens}</ul>
      <p style="text-align:center; margin: 28px 0;">
        <a href="${SITE_URL}/pro/dashboard"
           style="background:#0A6E5C; color:#fff; padding:13px 26px; border-radius:12px; text-decoration:none; font-weight:bold; display:inline-block;">
          Concluir meu cadastro
        </a>
      </p>
      <p style="color:#8E8E93; font-size:12px; line-height:1.5;">
        Equipe CuraDentes · Este é um e-mail automático, por favor não responda.
      </p>
    </div>`;
}

function htmlExclusao(nome: string | null): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1C1C1E;">
      <h2 style="color: #0A6E5C; margin-bottom: 4px;">CuraDentes</h2>
      <p>Olá${nome ? `, ${nome}` : ""}.</p>
      <p>Seu cadastro na <strong>CuraDentes</strong> foi iniciado há mais de um mês e não chegou a ser concluído.
      Por isso, seu <strong>pré-cadastro foi removido</strong> do nosso banco de dados.</p>
      <p>Não se preocupa: você continua bem-vindo(a)! Se ainda quiser fazer parte da CuraDentes,
      basta <strong>iniciar um novo cadastro</strong> — desta vez será do zero, com os mesmos dados ou novos.</p>
      <p style="text-align:center; margin: 28px 0;">
        <a href="${SITE_URL}/pro/novo-cadastro"
           style="background:#0A6E5C; color:#fff; padding:13px 26px; border-radius:12px; text-decoration:none; font-weight:bold; display:inline-block;">
          Começar um novo cadastro
        </a>
      </p>
      <p style="color:#8E8E93; font-size:12px; line-height:1.5;">
        Equipe CuraDentes · Este é um e-mail automático, por favor não responda.
      </p>
    </div>`;
}

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

  // ─── Autorização: somente o cron (com o segredo guardado em app_config) ────
  const { data: cfg } = await supabase
    .from("app_config").select("valor").eq("chave", "cron_secret").maybeSingle();
  const segredoEsperado = cfg?.valor;
  const secret = req.headers.get("x-cron-secret");
  if (!segredoEsperado || secret !== segredoEsperado) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  async function enviarEmail(to: string, subject: string, html: string): Promise<boolean> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Equipe CuraDentes <do-not-reply@curadentes.com.br>",
        to,
        subject,
        html,
      }),
    });
    if (!res.ok) console.error("[lembrete-cadastro] Resend falhou para", to, await res.text());
    return res.ok;
  }

  try {
    const agora = Date.now();
    // Cadastros incompletos: só consideramos quem já passou do 1º limiar (20 min).
    const corte20min = new Date(agora - 20 * MIN).toISOString();

    const { data: pendentes, error } = await supabase
      .from("curadentespro")
      .select("id, nome, email, telefone, cro, criado_em, lembrete_etapa")
      .eq("lgpd_aceito", false)
      .is("deleted_at", null)
      .lte("criado_em", corte20min)
      .not("email", "is", null);

    if (error) throw error;
    if (!pendentes || pendentes.length === 0) {
      return new Response(JSON.stringify({ ok: true, lembretes: 0, exclusoes: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    let lembretes = 0;
    let exclusoes = 0;

    for (const d of pendentes) {
      const ageMs = agora - new Date(d.criado_em as string).getTime();
      const devida = etapaDevida(ageMs);
      if (devida <= (d.lembrete_etapa ?? 0)) continue; // nada novo para esta conta

      // ─── Etapa 5: exclusão do pré-cadastro (perfil + login) ────────────────
      if (devida === 5) {
        const ok = await enviarEmail(
          d.email as string,
          "Seu pré-cadastro na CuraDentes foi removido",
          htmlExclusao(d.nome as string | null),
        );
        if (!ok) continue; // tenta de novo no próximo disparo

        // Apaga a conta de login (auth) e o perfil (cascateia cpf/endereços/etc).
        const { error: authErr } = await supabase.auth.admin.deleteUser(d.id as string);
        if (authErr) console.error("[lembrete-cadastro] admin.deleteUser falhou:", d.email, authErr.message);
        const { error: delErr } = await supabase.from("curadentespro").delete().eq("id", d.id);
        if (delErr) {
          console.error("[lembrete-cadastro] delete perfil falhou:", d.email, delErr.message);
          continue;
        }
        exclusoes++;
        continue;
      }

      // ─── Etapas 1..4: lembrete das pendências ──────────────────────────────
      const [{ count: temCpf }, { count: qtdEnderecos }] = await Promise.all([
        supabase.from("curadentespro_cpf").select("*", { count: "exact", head: true }).eq("curadentespro_id", d.id),
        supabase.from("curadentespro_enderecos").select("*", { count: "exact", head: true }).eq("curadentespro_id", d.id),
      ]);

      const pend: string[] = [];
      if (!d.telefone) pend.push("Telefone de contato");
      if (!temCpf) pend.push("CPF");
      if (!d.cro) pend.push("CRO (registro no conselho)");
      if (!qtdEnderecos) pend.push("Endereço de atendimento");
      if (pend.length === 0) pend.push("Aceitar os termos e concluir o cadastro");

      const itens = pend.map((p) => `<li style="margin-bottom:6px;">${p}</li>`).join("");
      const { subject, abertura } = textoLembrete(devida);
      const ok = await enviarEmail(d.email as string, subject, htmlLembrete(d.nome as string | null, abertura, itens));

      if (ok) {
        await supabase.from("curadentespro")
          .update({ lembrete_etapa: devida, lembrete_cadastro_enviado_em: new Date().toISOString() })
          .eq("id", d.id);
        lembretes++;
      }
    }

    return new Response(JSON.stringify({ ok: true, encontrados: pendentes.length, lembretes, exclusoes }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[lembrete-cadastro] Erro:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
