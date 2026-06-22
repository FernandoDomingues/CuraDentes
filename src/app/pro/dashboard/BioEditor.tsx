"use client";

// Editor da bio do dentista (ilha cliente dentro do dashboard).
// Salva direto no curadentespro via cliente do navegador (RLS owner-only).
// Bio vazia continua vazia — sem texto padrão (ver [[bio-dentista-sem-padrao]]).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { criarClienteNavegador } from "@/lib/supabase/client";

export default function BioEditor({ id, bioInicial }: { id: string; bioInicial: string }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [bio, setBio] = useState(bioInicial);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");

  async function salvar() {
    setSalvando(true);
    setMsg("");
    const supabase = criarClienteNavegador();
    const { error } = await supabase.from("curadentespro").update({ bio }).eq("id", id);
    setSalvando(false);
    if (error) {
      setMsg("Não foi possível salvar. Tente novamente.");
      return;
    }
    setEditando(false);
    router.refresh();
  }

  if (!editando) {
    return (
      <div>
        {bio?.trim() ? (
          <p className="leading-relaxed text-ink-soft">{bio}</p>
        ) : (
          <p className="text-ink-muted">Você ainda não escreveu uma bio.</p>
        )}
        <button
          onClick={() => setEditando(true)}
          className="mt-3 text-sm font-semibold text-brand-blue hover:underline"
        >
          {bio?.trim() ? "Editar bio" : "Adicionar bio"}
        </button>
      </div>
    );
  }

  return (
    <div>
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        rows={5}
        maxLength={500}
        placeholder="Conte um pouco sobre você e seu atendimento (opcional)."
        className="w-full rounded-xl border border-black/15 p-3 text-[15px] outline-none focus:border-brand-blue"
      />
      <div className="mt-1 text-right text-xs text-ink-muted">{bio.length}/500</div>
      {msg && <p className="text-sm text-danger">{msg}</p>}
      <div className="mt-2 flex gap-2">
        <button
          onClick={salvar}
          disabled={salvando}
          className="rounded-[12px] bg-brand-blue px-5 py-2 text-sm font-semibold text-white hover:bg-brand-blue-600 disabled:opacity-60"
        >
          {salvando ? "Salvando…" : "Salvar"}
        </button>
        <button
          onClick={() => { setBio(bioInicial); setEditando(false); setMsg(""); }}
          className="rounded-[12px] border border-black/15 px-5 py-2 text-sm font-medium text-ink-soft hover:bg-black/5"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
