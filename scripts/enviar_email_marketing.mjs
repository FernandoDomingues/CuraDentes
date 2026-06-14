// ═══════════════════════════════════════════════════════════════════════════════
// ENVIO DO EMAIL MARKETING (Beta lançado) via Resend — ASSUNTO REAL embutido aqui.
//
// O assunto do email é um cabeçalho definido no ENVIO (não no HTML). Por isso ele
// mora aqui, na chamada da API, e não no <title> do arquivo.
//
// Uso (Node 18+):
//   RESEND_API_KEY=xxx node scripts/enviar_email_marketing.mjs --test voce@email.com
//      -> envia 1 email de TESTE para o endereço indicado.
//   RESEND_API_KEY=xxx node scripts/enviar_email_marketing.mjs --to "a@x.com:TOKEN,b@y.com:TOKEN" --send
//      -> envia para a lista (sem --send é dry-run). Cada item pode ser "email" ou
//         "email:token" — o token vira o link de descadastro ({{UNSUB_TOKEN}}).
//      -> no --test, use --token TOKEN para validar o link de descadastro.
//   RESEND_API_KEY=xxx CRON_SECRET=yyy node scripts/enviar_email_marketing.mjs --categoria novidades --send
//      -> monta a lista pela edge function lista-envio-campanha (dentistas com
//         opt-in na categoria) e envia, com o token de cada um no link de descadastro.
//         Categorias: desempenho | novidades | parceiros. Sem --send é dry-run.
//   ...--asset-base https://curadentes.com.br/email   (reescreve as imagens relativas
//      para URL absoluta — OBRIGATÓRIO para as imagens aparecerem na caixa de entrada).
//
// Segurança: sem --send, NÃO envia para a lista (apenas simula). O modo --test sempre
// envia (1 destinatário) para você validar.
// ═══════════════════════════════════════════════════════════════════════════════

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML_PATH = resolve(__dirname, "..", "email marketing - informativo", "plano mensal", "index.html");

// ─── Configuração do email ──────────────────────────────────────────────────
const SUBJECT = "O CuraDentes Pro chegou — e você faz parte do começo 🦷";
const FROM = "Equipe CuraDentes <do-not-reply@curadentes.com.br>";

// ─── Args ───────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
// Destinatários podem vir como "email" ou "email:token" (token = link de descadastro)
const parsePar = (s) => { const i = s.indexOf(":"); return i < 0 ? { email: s, token: "" } : { email: s.slice(0, i), token: s.slice(i + 1) }; };
const testRaw = getArg("--test");
const testTok = getArg("--token");
const categoria = getArg("--categoria"); // monta a lista via edge function (opt-in)
const funcUrl = getArg("--func-url") || "https://dsnzgxjuqlalysyfiion.supabase.co/functions/v1/lista-envio-campanha";
let toList = (getArg("--to") || "").split(",").map((s) => s.trim()).filter(Boolean).map(parsePar);
const assetBase = getArg("--asset-base");
const doSend = args.includes("--send");

const API_KEY = process.env.RESEND_API_KEY;
if (!API_KEY) {
  console.error("✖ Defina RESEND_API_KEY no ambiente. Ex.: RESEND_API_KEY=re_xxx node scripts/enviar_email_marketing.mjs --test voce@email.com");
  process.exit(1);
}

// ─── Carrega o HTML e (opcional) reescreve imagens relativas p/ URL absoluta ──
let html = readFileSync(HTML_PATH, "utf8");
if (assetBase) {
  const base = assetBase.replace(/\/$/, "");
  // src="CuraDentesPro%20-%20000.png" -> src="<base>/CuraDentesPro%20-%20000.png"
  html = html.replace(/src="(?!https?:|data:|cid:)([^"]+)"/g, (_m, p) => `src="${base}/${p.replace(/^\.?\//, "")}"`);
} else {
  const temRelativa = /src="(?!https?:|data:|cid:)[^"]+"/.test(html);
  if (temRelativa) {
    console.warn("⚠ Há imagens com caminho RELATIVO no HTML — elas NÃO vão aparecer na caixa de entrada.");
    console.warn("  Passe --asset-base https://SEU-DOMINIO/caminho para reescrevê-las (após hospedar as imagens).");
  }
}

function htmlPara(token) {
  if (!token) console.warn("  ⚠ sem token — o link 'Cancelar inscrição' ficará incompleto neste envio.");
  return html.replace(/\{\{UNSUB_TOKEN\}\}/g, token || "");
}

async function enviar(to, token) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject: SUBJECT, html: htmlPara(token) }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${JSON.stringify(body)}`);
  return body;
}

console.log("Assunto :", SUBJECT);
console.log("De      :", FROM);
console.log("HTML    :", HTML_PATH, `(${html.length} bytes)`);

// Lista de envio montada pela edge function (dentistas com opt-in na categoria)
if (categoria && !testRaw) {
  const CRON = process.env.CRON_SECRET;
  if (!CRON) { console.error("✖ Defina CRON_SECRET para montar a lista da campanha (segredo do app_config)."); process.exit(1); }
  console.log(`\n→ Montando lista pela edge function (categoria: ${categoria}) ...`);
  const r = await fetch(funcUrl, {
    method: "POST",
    headers: { "x-cron-secret": CRON, "Content-Type": "application/json" },
    body: JSON.stringify({ categoria }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { console.error("✖ Falha ao montar a lista:", JSON.stringify(j)); process.exit(1); }
  toList = (j.destinatarios || []).map((d) => ({ email: d.email, token: d.token }));
  console.log(`  ${toList.length} destinatário(s) com opt-in em "${categoria}".`);
}

if (testRaw) {
  const { email, token } = parsePar(testRaw);
  console.log(`\n→ Enviando TESTE para ${email} ...`);
  const r = await enviar(email, token || testTok || "");
  console.log("✓ Enviado. id:", r.id);
} else if (toList.length) {
  console.log(`\nDestinatários: ${toList.length}`);
  if (!doSend) {
    console.log("DRY-RUN (sem --send): nada foi enviado. Reveja a lista e rode de novo com --send.");
  } else {
    let ok = 0, fail = 0;
    for (const { email, token } of toList) {
      try { await enviar(email, token); ok++; console.log("  ✓", email); }
      catch (e) { fail++; console.error("  ✖", email, e.message); }
      await new Promise((r) => setTimeout(r, 120)); // respeita rate limit
    }
    console.log(`\nConcluído: ${ok} enviados, ${fail} falhas.`);
  }
} else {
  console.log("\nNada a fazer. Use --test <email> (validar) ou --to \"a,b,c\" [--send] (lista).");
}
