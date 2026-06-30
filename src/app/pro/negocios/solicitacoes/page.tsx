import { redirect } from "next/navigation";

// Consolidado no painel /pro/negocios (aba Recebidas).
export default function SolicitacoesRedirect() {
  redirect("/pro/negocios?aba=recebidas");
}
