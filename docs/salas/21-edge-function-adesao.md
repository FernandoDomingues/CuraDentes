# Edge Function `notificar-adesao-clinica` (Passo 5 da adesão de clínica)

Avisa por e-mail o **DONO da clínica** quando outro dentista se cadastra no mesmo
endereço físico (mesma `clinica_key`) e cria um **pedido de adesão pendente**.

O código do site **já chama** esta função, **best-effort** (se ela não existir, a falha
é engolida e nada quebra — o pedido continua aparecendo em `/pro/adesoes`):

- `src/app/pro/editar-perfil/acoes.ts` → após `sincronizar_clinica` retornar `'pendente'`
- `src/app/cadastro/acoes.ts` → idem, no cadastro novo

Payload enviado: `{ endereco_id: "<uuid do endereço do novo dentista>" }`.

> **Por que Edge Function e não Resend direto no Next (Opção A, a mais segura)?**
> A `RESEND_API_KEY` fica **só dentro do Supabase** (nos Secrets das Functions), nunca no
> Next/Vercel. Assim a chave não corre risco de vazar pelo bundle/log do front, e a função
> usa a **service-role** apenas do lado servidor para LER o e-mail do dono (que NÃO é legível
> via REST — coluna protegida). O corpo do e-mail **não** expõe contato de ninguém.

---

## Secrets necessários (Supabase → Edge Functions → Secrets)

```
SUPABASE_URL                 (já existe no ambiente das functions)
SUPABASE_SERVICE_ROLE_KEY    (já existe; leitura sem RLS p/ pegar o e-mail do dono)
RESEND_API_KEY               (já existe — é o mesmo das outras funções de e-mail)
EMAIL_REMETENTE              ex.: "CuraDentes <no-reply@curadentes.com.br>"
SITE_URL                     ex.: "https://www.curadentes.com.br"
```

Se você já publicou `notificar-reserva-sala` / `send-rating-notification`, esses secrets
já estão setados — **não precisa setar de novo**.

---

## Código — `supabase/functions/notificar-adesao-clinica/index.ts`

```ts
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
```

---

## Deploy

```bash
supabase functions deploy notificar-adesao-clinica
# (secrets só se ainda não existirem — provavelmente já existem)
# supabase secrets set RESEND_API_KEY=...  EMAIL_REMETENTE="CuraDentes <no-reply@curadentes.com.br>"  SITE_URL=https://www.curadentes.com.br
```

Ou pelo painel: **Supabase → Edge Functions → Deploy a new function**, cole o código,
nome `notificar-adesao-clinica`.

---

## Como CONFERIR se o domínio está verificado na Resend (você pediu p/ aprender)

O e-mail só **chega** se o domínio remetente (`curadentes.com.br`) estiver **verificado** na
Resend. Duas formas de checar:

### A) Pelo painel da Resend (o jeito oficial — 30 segundos)
1. Entre em **https://resend.com** → faça login.
2. Menu lateral **Domains**.
3. Procure `curadentes.com.br`. O status precisa estar **Verified** (verdinho).
   - Se estiver **Pending/Not started**, clique no domínio: a Resend lista os registros
     **SPF, DKIM e DMARC** que faltam. É só copiar cada um para o DNS do domínio (onde o
     domínio está hospedado — no nosso caso a zona DNS) e clicar **Verify** de novo.
   - Regra de ouro do SPF: **só pode existir UM** registro `TXT` de SPF (`v=spf1 ...`). Se já
     houver um, **mescle** o `include:` da Resend nele — não crie um segundo.

### B) Pelo DNS, sem entrar na Resend (confere o que está publicado de verdade)
No PowerShell:

```powershell
# SPF (precisa conter include:amazonses.com — a Resend envia pela AWS SES)
Resolve-DnsName -Type TXT send.curadentes.com.br
# DKIM (a Resend cria uma chave em resend._domainkey)
Resolve-DnsName -Type TXT resend._domainkey.curadentes.com.br
# DMARC (política do domínio)
Resolve-DnsName -Type TXT _dmarc.curadentes.com.br
```

Se os três responderem com conteúdo (SPF com `amazonses.com`, DKIM com uma chave longa
`p=...`, DMARC com `v=DMARC1`), o domínio está apto a enviar.

> **Status atual (conferido por mim no DNS em 27/06/2026):** ✅ já está verificado —
> SPF com `include:amazonses.com`, DKIM `resend._domainkey` presente, DMARC `p=none` ativo,
> MX de retorno `feedback-smtp.sa-east-1.amazonses.com`. As outras funções de e-mail do
> projeto (`send-rating-notification`, `lembrete-cadastro`) já enviam por ele. Então, em tese,
> **não precisa mexer em DNS** — só publicar a função.

---

## Teste rápido após publicar

1. Com a conta **B** (outro dentista), entre o CEP/número de uma clínica que existe (ex.: a
   Villa Amato), escolha **"Usar este nome"** e salve → cria adesão pendente.
2. O **dono** (conta A) deve receber o e-mail com assunto *"Novo pedido de adesão…"* e o link
   para `/pro/adesoes`.
3. Mesmo sem o e-mail, o pedido já aparece em **/pro/adesoes** (badge no dashboard) — o e-mail
   é só a conveniência de avisar sem precisar abrir o site.
```
