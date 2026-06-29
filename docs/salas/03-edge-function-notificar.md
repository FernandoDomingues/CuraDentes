# Edge Function `notificar-reserva-sala` (OPCIONAL na Fase 1)

O código já chama esta função em dois pontos, **best-effort** (se ela não existir, a
falha é engolida e nada quebra):

- `src/app/salas/acoes.ts` → `solicitarReserva` invoca `{ tipo: "nova", solicitacao_id }`
- `src/app/pro/salas/acoes.ts` → `decidirSolicitacao` invoca `{ tipo: "aprovada" | "recusada", solicitacao_id }`

Ou seja: **a Fase 1 funciona inteira sem esta função** — as solicitações aparecem nos
painéis (`/pro/salas/solicitacoes` e `/pro/minhas-solicitacoes`) em tempo real. O e-mail
é só uma conveniência (avisar a contraparte sem ela precisar abrir o site). Crie isto
quando quiser, escolhendo o provedor de e-mail.

> **Provedor definido: Resend** (já é o do projeto). O template abaixo já usa Resend
> (`RESEND_API_KEY`) chamado de dentro da Edge Function do Supabase — não precisa de
> função na Vercel. Caixas de `@curadentes.com.br` ficam na **Hostinger** (isso é o MX /
> e-mail que *chega*, não tem a ver com o envio transacional).
>
> **Pré-requisito de entrega (uma vez):** verificar o domínio `curadentes.com.br` na Resend
> com **SPF + DKIM** (e DMARC) na zona DNS do domínio. Atenção: só pode haver **um** registro
> SPF — se a Hostinger já tem um, **mescle** o `include` da Resend nele (não crie outro).
> Remetente sugerido: `no-reply@curadentes.com.br`.

## Secrets necessários (Supabase → Edge Functions → Secrets)

```
SUPABASE_URL                 (já existe no ambiente das functions)
SUPABASE_SERVICE_ROLE_KEY    (já existe; dá leitura sem RLS para pegar os e-mails)
RESEND_API_KEY               (novo — só se usar Resend)
EMAIL_REMETENTE              ex.: "CuraDentes <no-reply@curadentes.com.br>"
SITE_URL                     ex.: "https://www.curadentes.com.br"
```

## Código — `supabase/functions/notificar-reserva-sala/index.ts`

```ts
// Deno / Supabase Edge Function. Recebe { tipo, solicitacao_id } e avisa a parte certa.
//   nova      → avisa o ANFITRIÃO   (recebeu um pedido)
//   aprovada  → avisa o LOCATÁRIO   (pedido aprovado; contato liberado no painel)
//   recusada  → avisa o LOCATÁRIO   (pedido recusado)
// Não coloca PII de contato no corpo do e-mail — manda a pessoa abrir o painel.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE = Deno.env.get("SITE_URL") ?? "https://www.curadentes.com.br";

Deno.serve(async (req) => {
  try {
    const { tipo, solicitacao_id } = await req.json();
    if (!solicitacao_id || !["nova", "aprovada", "recusada"].includes(tipo)) {
      return new Response("payload invalido", { status: 400 });
    }

    // service-role: ignora RLS só para LER os e-mails das partes (server-only, seguro).
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: sol } = await sb
      .from("solicitacoes_reserva")
      .select("anfitriao_id, locatario_id, data, hora_inicio, hora_fim, sala:salas(titulo)")
      .eq("id", solicitacao_id)
      .maybeSingle();
    if (!sol) return new Response("solicitacao inexistente", { status: 404 });

    const alvoId = tipo === "nova" ? sol.anfitriao_id : sol.locatario_id;
    const { data: alvo } = await sb
      .from("curadentespro")
      .select("nome, email")
      .eq("id", alvoId)
      .maybeSingle();
    if (!alvo?.email) return new Response("sem email do alvo", { status: 200 });

    const titulo = (sol as { sala?: { titulo?: string } }).sala?.titulo ?? "sua sala";
    const quando = `${String(sol.data).split("-").reverse().join("/")} ${sol.hora_inicio}–${sol.hora_fim}`;

    const msg = {
      nova: {
        assunto: "Novo pedido de reserva de sala",
        corpo: `Você recebeu um pedido para "${titulo}" em ${quando}. Aprove ou recuse em ${SITE}/pro/salas/solicitacoes`,
      },
      aprovada: {
        assunto: "Seu pedido de sala foi aprovado",
        corpo: `Boa notícia! O pedido para "${titulo}" em ${quando} foi aprovado. Veja o contato da clínica em ${SITE}/pro/minhas-solicitacoes`,
      },
      recusada: {
        assunto: "Seu pedido de sala foi recusado",
        corpo: `O pedido para "${titulo}" em ${quando} não foi aceito. Veja outras salas em ${SITE}/salas`,
      },
    }[tipo as "nova" | "aprovada" | "recusada"];

    await enviarEmail(alvo.email, msg.assunto, msg.corpo);
    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("[notificar-reserva-sala]", e);
    return new Response("erro", { status: 500 });
  }
});

// ─── Troque este bloco pelo seu provedor, se não for Resend ──────────────────────
async function enviarEmail(para: string, assunto: string, texto: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return; // sem provedor: vira no-op (o painel continua sendo a fonte da verdade)
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

## Deploy

```bash
supabase functions deploy notificar-reserva-sala
# secrets (uma vez):
supabase secrets set RESEND_API_KEY=...  EMAIL_REMETENTE="CuraDentes <no-reply@curadentes.com.br>"  SITE_URL=https://www.curadentes.com.br
```

> Observação de segurança: a função usa a **service-role key** só para ler o e-mail da
> parte a ser avisada (que não é legível via REST). Ela NÃO expõe contato no corpo do
> e-mail — a revelação de contato continua só no painel, atrás da RPC `contato_da_reserva`,
> que exige solicitação **aprovada**.
