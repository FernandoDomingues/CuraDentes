import { redirect } from "next/navigation";

// Consolidado no painel /pro/salas (aba Minhas solicitações).
export default function MinhasSolicitacoesRedirect() {
  redirect("/pro/salas?aba=enviadas");
}
