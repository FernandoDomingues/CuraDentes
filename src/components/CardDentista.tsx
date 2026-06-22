// Card de resultado de um dentista (usado na busca e na urgência).
// Presentacional: recebe os dados já prontos e linka para /dentista/[id].

import Image from "next/image";
import Link from "next/link";
import Estrelas from "./Estrelas";

const AVATAR_PADRAO =
  "https://dsnzgxjuqlalysyfiion.supabase.co/storage/v1/object/public/fotos-dentistas/default-avatar.webp";

export interface CardDentistaProps {
  id: string;
  nome: string;
  foto?: string;
  croVerificado?: boolean;
  cidade?: string;
  bairro?: string;
  clinica?: string;
  atividades?: string[];
  avaliacao?: number;
  totalAvaliacoes?: number;
  /** Selo de destaque (ex.: "Atende urgências"). */
  destaque?: string;
  /** Distância já formatada (ex.: "2,3 km"). */
  distancia?: string;
}

export default function CardDentista(p: CardDentistaProps) {
  const local = [p.bairro, p.cidade].filter(Boolean).join(", ");
  return (
    <Link
      href={`/dentista/${p.id}`}
      className="group flex gap-4 rounded-2xl border border-black/8 bg-white p-4 transition-all hover:border-brand-blue/40 hover:shadow-[0_8px_20px_rgba(0,122,255,0.10)]"
    >
      <Image
        src={p.foto || AVATAR_PADRAO}
        alt={`Foto de ${p.nome}`}
        width={72}
        height={72}
        className="h-18 w-18 flex-shrink-0 rounded-xl border border-black/10 object-cover"
        style={{ height: 72, width: 72 }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate font-semibold text-brand-navy transition-colors group-hover:text-brand-blue">
            {p.nome}
          </h3>
          {p.croVerificado && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-blue/10 px-2 py-0.5 text-xs font-semibold text-brand-blue">
              CRO ✓
            </span>
          )}
          {p.destaque && (
            <span className="rounded-full bg-brand-magenta/10 px-2 py-0.5 text-xs font-semibold text-brand-magenta">
              {p.destaque}
            </span>
          )}
        </div>

        {local && <p className="mt-0.5 truncate text-sm text-ink-muted">{local}</p>}

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          {typeof p.avaliacao === "number" && p.totalAvaliacoes ? (
            <Estrelas nota={p.avaliacao} total={p.totalAvaliacoes} tamanho="sm" />
          ) : (
            <span className="text-xs text-ink-muted">Sem avaliações ainda</span>
          )}
          {p.distancia && <span className="text-xs font-medium text-brand-blue">{p.distancia}</span>}
        </div>

        {p.atividades && p.atividades.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {p.atividades.slice(0, 3).map((a) => (
              <span key={a} className="rounded-lg bg-brand-soft px-2 py-0.5 text-xs text-brand-navy">
                {a}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
