import type { SyntheticEvent } from "react";
import { AVATAR_PADRAO } from "@/lib/site";

// Fallback de avatar quebrado: troca a foto remota que falhou (404 / Storage fora)
// pelo avatar padrão, UMA única vez (data-fb evita laço se o padrão também falhar).
// Centralizado aqui para reuso em todos os cards/listas de dentista (auditoria B10).
export function aoFalharAvatar(e: SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (img.dataset.fb) return;
  img.dataset.fb = "1";
  img.src = AVATAR_PADRAO;
}
