// ═══════════════════════════════════════════════════════════════════════════════
// ENVIO DO EMAIL MARKETING (Beta lançado) via Resend — ASSUNTO REAL embutido aqui.
//
// O assunto do email é um cabeçalho definido no ENVIO (não no HTML). Por isso ele
// mora aqui, na chamada da API, e não no <title> do arquivo.
//
// Uso (Node 18+):
//   RESEND_API_KEY=xxx node scripts/enviar_email_marketing.mjs --test voce@email.com
//      -> envia 1 email de TESTE para o endereço indicado.
//   RESEND_API_KEY=xxx node scripts/enviar_email_marketing.mjs --to "a@x.com,b@y.com" --send
//      -> envia para a lista informada (sem --send é dry-run: só mostra o que faria).
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
const testTo = getArg("--test");
const toList = (getArg("--to") || "").split(",").map((s) => s.trim()).filter(Boolean);
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

async function enviar(to) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject: SUBJECT, html }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${JSON.stringify(body)}`);
  return body;
}

console.log("Assunto :", SUBJECT);
console.log("De      :", FROM);
console.log("HTML    :", HTML_PATH, `(${html.length} bytes)`);

if (testTo) {
  console.log(`\n→ Enviando TESTE para ${testTo} ...`);
  const r = await enviar(testTo);
  console.log("✓ Enviado. id:", r.id);
} else if (toList.length) {
  console.log(`\nDestinatários: ${toList.length}`);
  if (!doSend) {
    console.log("DRY-RUN (sem --send): nada foi enviado. Reveja a lista e rode de novo com --send.");
    process.exit(0);
  }
  let ok = 0, fail = 0;
  for (const to of toList) {
    try { await enviar(to); ok++; console.log("  ✓", to); }
    catch (e) { fail++; console.error("  ✖", to, e.message); }
    await new Promise((r) => setTimeout(r, 120)); // respeita rate limit
  }
  console.log(`\nConcluído: ${ok} enviados, ${fail} falhas.`);
} else {
  console.log("\nNada a fazer. Use --test <email> (validar) ou --to \"a,b,c\" [--send] (lista).");
}
