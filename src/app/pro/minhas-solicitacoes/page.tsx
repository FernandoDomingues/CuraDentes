import { redirect } from "next/navigation";

// Consolidado no painel /pro/negocios (aba Minhas solicitações).
export default function MinhasSolicitacoesRedirect() {
  redirect("/pro/negocios?aba=enviadas");
}
