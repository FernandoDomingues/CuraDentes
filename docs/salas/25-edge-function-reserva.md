# Edge Function `notificar-reserva-sala` (e-mails HTML da locação de salas)

> ⚠️ **ISTO NÃO É SQL.** É uma **Edge Function** (TypeScript/Deno). Publique na seção
> **Edge Functions** do Supabase (ou via CLI), como você fez com `notificar-adesao-clinica`.
> O SQL Editor recusaria (`42601`). Substitui o template antigo em texto do `docs/salas/03`.

O site **já chama** esta função, best-effort (se ela não existir, ninguém recebe e-mail,
mas o painel continua funcionando):
- `src/app/coworking/acoes.ts` → `solicitarReserva` invoca `{ tipo: "nova", solicitacao_id }`
- `src/app/pro/negocios/acoes.ts` → `decidirSolicitacao` invoca `{ tipo: "aprovada" | "recusada", solicitacao_id }`

**Por isso não chegava e-mail no Bloco 3:** a função nunca tinha sido publicada.

## Quem recebe o quê
| Evento | Dispara | E-mail |
|---|---|---|
| **nova** (locatário solicitou) | `solicitarReserva` | **Anfitrião** recebe "Novo pedido de reserva" (CTA → `/pro/negocios?aba=recebidas`) **e** o **Locatário** recebe a confirmação "Pedido enviado" (CTA → `?aba=enviadas`) |
| **aprovada** | `decidirSolicitacao` | **Locatário**: "Reserva aprovada 🎉 — **pagamento pendente**" (reforça: pagar as horas direto com a clínica; CTA → ver contato) |
| **recusada** | `decidirSolicitacao` | **Locatário**: "Pedido não aprovado" (CTA → `/coworking`) |
| **pagamento** | `marcarPagamentoResolvido` (anfitrião clica "Confirmar pagamento recebido") | **Locatário**: "Pagamento confirmado pela clínica ✅" |

Sem PII de contato (telefone/e-mail) no corpo — a revelação de contato continua só no painel,
após a aprovação. O e-mail é HTML na identidade **CuraDentes Pro** (header magenta `#b50048`,
card 600px, footer com Privacidade/Termos), no mesmo estilo do informativo de marketing.

## Secrets (já devem existir — as outras funções de e-mail usam os mesmos)
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (injetados automaticamente), `RESEND_API_KEY`,
`EMAIL_REMETENTE` (ex.: `CuraDentes <no-reply@curadentes.com.br>`), `SITE_URL`.

## Deploy (CLI — igual à função de adesão)
Rode de dentro de `site-R0`:
```powershell
supabase functions deploy notificar-reserva-sala --project-ref dsnzgxjuqlalysyfiion
```
(Fonte já versionada em `supabase/functions/notificar-reserva-sala/index.ts`.) O
`WARNING: Docker is not running` é inofensivo (a v2 sobe pela API). Como o Supabase é
compartilhado Preview↔prod, ao publicar a função **já vale para os dois**.

## Testar (Bloco 3)
1. Como **locatário (B)**, solicite um horário de uma sala da conta **anfitriã (C)**.
2. **C** deve receber "Novo pedido de reserva" e **B** a confirmação "Pedido enviado".
3. **C** aprova em `/pro/negocios` → **B** recebe "Reserva aprovada".
4. **C** recusa outro pedido → **B** recebe "Pedido não aprovado".

Ver logs: `supabase functions logs notificar-reserva-sala --project-ref dsnzgxjuqlalysyfiion`.
