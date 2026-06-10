// ═══════════════════════════════════════════════════════════════════════════════
// EDGE FUNCTION: scrape-cro
//
// Interage com o sistema SISCAF/CFO para consultar a situação do CRO de um
// dentista. O fluxo é:
//   1. GET /captcha  → Inicia sessão, retorna CAPTCHA em base64 + session_id
//   2. POST /consultar  → Envia CRO + CAPTCHA resolvido, retorna dados scrapados
//
// Uso:
//   GET  /functions/v1/scrape-cro/captcha?cro=CRO-SP123456
//   POST /functions/v1/scrape-cro/consultar
//         { "cro": "CRO-SP123456", "captcha": "ABC123", "session_id": "..." }
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.210.0/http/server.ts";
import { JSDOM } from "npm:jsdom";

const SISCAF_BASE = "https://siscaf.cfo.org.br";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

interface CaptchaResponse {
  session_id: string;
  captcha_base64: string;
}

interface ConsultaRequest {
  cro: string;
  captcha: string;
  session_id: string;
}

interface ConsultaResponse {
  success: boolean;
  dados: DadosProfissional | null;
  erro?: string;
}

interface DadosProfissional {
  nome: string | null;
  situacao: string | null;
  inscricao: string | null;
  data_inscricao: string | null;
  validade: string | null;
  especialidades: string[];
  endereco: string | null;
  pendencias: boolean;
}

// ─── Armazenamento em memória (sessões temporárias) ──────────────────────────
// Em produção, usar Supabase KV ou tabela no banco.
const sessoes = new Map<string, { captchaText?: string; cookies: string[] }>();

function gerarIdSessao(): string {
  return crypto.randomUUID();
}

// ─── Cabeçalhos padrão ────────────────────────────────────────────────────────

function headers(cookies: string[] = []): Record<string, string> {
  const h: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.5",
  };
  if (cookies.length > 0) {
    h.Cookie = cookies.join("; ");
  }
  return h;
}

function extrairCookies(resp: Response): string[] {
  const raw = resp.headers.get("set-cookie");
  if (!raw) return [];
  return raw.split(",").map((c) => c.split(";")[0].trim()).filter(Boolean);
}

// ─── 1. Iniciar sessão + obter CAPTCHA ──────────────────────────────────────

async function iniciarSessao(): Promise<CaptchaResponse> {
  // Acessa a página principal para obter cookies de sessão
  const resp1 = await fetch(SISCAF_BASE + "/siscaf/consulta/profissional", {
    headers: headers(),
    redirect: "manual",
  });

  const cookies = extrairCookies(resp1);

  // Tenta extrair o CAPTCHA da página
  const html = await resp1.text();
  const doc = new JSDOM(html).window.document;
  const sessionId = gerarIdSessao();

  // Procura pela imagem do CAPTCHA
  let captchaBase64 = "";
  const imgs = doc.querySelectorAll("img");
  for (const img of imgs) {
    const src = img.getAttribute("src") || "";
    if (src.includes("captcha") || src.includes("Captcha")) {
      const captchaUrl = src.startsWith("http") ? src : SISCAF_BASE + src;
      const respImg = await fetch(captchaUrl, {
        headers: { ...headers(cookies), Cookie: cookies.join("; ") },
      });
      const buffer = await respImg.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      captchaBase64 = btoa(binary);
      break;
    }
  }

  // Se não encontrou CAPTCHA via img, tenta via endpoint direto
  if (!captchaBase64) {
    const captchaEndpoint = SISCAF_BASE + "/siscaf/Captcha";
    const respImg = await fetch(captchaEndpoint, {
      headers: { ...headers(cookies), Cookie: cookies.join("; ") },
    });
    const buffer = await respImg.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    captchaBase64 = btoa(binary);
  }

  sessoes.set(sessionId, { cookies });

  return { session_id: sessionId, captcha_base64: captchaBase64 };
}

// ─── 2. Consultar CRO com CAPTCHA resolvido ─────────────────────────────────

async function consultarCro(
  cro: string,
  captcha: string,
  sessionId: string,
): Promise<ConsultaResponse> {
  const sessao = sessoes.get(sessionId);
  if (!sessao) {
    return { success: false, dados: null, erro: "Sessão expirada ou inválida. Solicite um novo CAPTCHA." };
  }

  // Tenta submeter o formulário de consulta
  const formData = new URLSearchParams();
  formData.set("cro", cro.replace(/\D/g, ""));
  formData.set("captcha", captcha);
  formData.set("tipo", "CRO");
  formData.set("acao", "pesquisar");

  const resp = await fetch(SISCAF_BASE + "/siscaf/consulta/profissional", {
    method: "POST",
    headers: {
      ...headers(sessao.cookies),
      Cookie: sessao.cookies.join("; "),
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: SISCAF_BASE + "/siscaf/consulta/profissional",
    },
    body: formData.toString(),
    redirect: "manual",
  });

  const html = await resp.text();

  // Se voltou pra mesma página → CAPTCHA inválido
  if (html.includes("captcha") && (html.includes("Código inválido") || html.includes("captcha_invalido"))) {
    return { success: false, dados: null, erro: "CAPTCHA inválido. Tente novamente." };
  }

  // Parseia os dados do profissional
  const doc = new JSDOM(html).window.document;

  const dados: DadosProfissional = {
    nome: extrairTexto(doc, "nome") || extrairTextoPorLabel(doc, "Nome"),
    situacao: extrairTexto(doc, "situacao") || extrairTextoPorLabel(doc, "Situação"),
    inscricao: cro,
    data_inscricao: extrairTexto(doc, "dataInscricao") || extrairTextoPorLabel(doc, "Data Inscrição"),
    validade: extrairTexto(doc, "validade") || extrairTextoPorLabel(doc, "Validade"),
    especialidades: extrairLista(doc, "especialidades") || extrairListaPorLabel(doc, "Especialidade"),
    endereco: extrairTexto(doc, "endereco") || extrairTextoPorLabel(doc, "Endereço"),
    pendencias: html.includes("pendência") || html.includes("Pendência"),
  };

  return {
    success: true,
    dados: Object.values(dados).some((v) => v !== null && v !== "" && !(Array.isArray(v) && v.length === 0))
      ? dados
      : null,
    erro: dados.nome ? undefined : "Não foi possível extrair os dados. O layout do SISCAF pode ter mudado.",
  };
}

// ─── Helpers de parsing ─────────────────────────────────────────────────────

function extrairTexto(doc: Document, id: string): string | null {
  const el = doc.getElementById(id);
  return el?.textContent?.trim() || null;
}

function extrairTextoPorLabel(doc: Document, label: string): string | null {
  const elements = doc.querySelectorAll("td, span, div, label, p");
  for (const el of elements) {
    if (el.textContent?.includes(label)) {
      const next = el.nextElementSibling || el.parentElement?.nextElementSibling;
      if (next) return next.textContent?.trim() || null;
    }
  }
  return null;
}

function extrairLista(doc: Document, id: string): string[] {
  const el = doc.getElementById(id);
  if (!el) return [];
  const items = el.querySelectorAll("li, option, span");
  return Array.from(items).map((i) => i.textContent?.trim() || "").filter(Boolean);
}

function extrairListaPorLabel(doc: Document, label: string): string[] {
  const elements = doc.querySelectorAll("td, span, div, label");
  for (const el of elements) {
    if (el.textContent?.includes(label)) {
      const parent = el.closest("tr") || el.closest("div");
      if (parent) {
        const cells = parent.querySelectorAll("td, span");
        return Array.from(cells)
          .map((c) => c.textContent?.trim() || "")
          .filter((t) => t && !t.includes(label));
      }
    }
  }
  return [];
}

// ─── Router ──────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/functions\/v1\/scrape-cro/, "");

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (path === "/captcha" && req.method === "GET") {
      const cro = url.searchParams.get("cro") || "";
      if (!cro) {
        return new Response(
          JSON.stringify({ error: "Parâmetro 'cro' é obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const result = await iniciarSessao();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "/consultar" && req.method === "POST") {
      const body: ConsultaRequest = await req.json();
      if (!body.cro || !body.captcha || !body.session_id) {
        return new Response(
          JSON.stringify({ error: "Campos 'cro', 'captcha' e 'session_id' são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const result = await consultarCro(body.cro, body.captcha, body.session_id);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Rota não encontrada" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[scrape-cro] Erro:", err);
    return new Response(
      JSON.stringify({ error: `Erro interno: ${err instanceof Error ? err.message : String(err)}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
