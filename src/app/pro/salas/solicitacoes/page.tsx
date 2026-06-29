import { redirect } from "next/navigation";

// Consolidado no painel /pro/salas (aba Recebidas).
export default function SolicitacoesRedirect() {
  redirect("/pro/salas?aba=recebidas");
}
