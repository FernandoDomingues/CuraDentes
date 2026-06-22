"use client";

// Ações da conta no dashboard (ilha cliente): Sair e Excluir conta.
//   • Sair: signOut no navegador (limpa cookies) → home.
//   • Excluir: confirma, chama RPC apagar_minha_conta_dentista (soft-delete),
//     faz signOut e vai para a home. Mesma semântica do site-k11.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { encerrarSessao } from "@/lib/encerrar-sessao";

export default function AcoesConta() {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");

  async function sair() {
    setOcupado(true);
    const supabase = criarClienteNavegador();
    await encerrarSessao(supabase);
    router.replace("/");
    router.refresh();
  }

  async function excluir() {
    setOcupado(true);
    setErro("");
    const supabase = criarClienteNavegador();
    const { error } = await supabase.rpc("apagar_minha_conta_dentista");
    if (error) {
      setErro("Não foi possível excluir a conta agora. Tente novamente.");
      setOcupado(false);
      return;
    }
    await encerrarSessao(supabase);
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={sair}
        disabled={ocupado}
        className="rounded-[12px] border border-black/15 px-5 py-2.5 text-sm font-semibold text-ink-soft hover:bg-black/5 disabled:opacity-60"
      >
        Sair da conta
      </button>

      {!confirmando ? (
        <button
          onClick={() => setConfirmando(true)}
          className="text-sm font-medium text-danger hover:underline"
        >
          Excluir minha conta
        </button>
      ) : (
        <div className="rounded-xl border border-danger/20 bg-danger/5 p-4">
          <p className="text-sm text-ink-soft">
            Tem certeza? Seu perfil deixará de aparecer nas buscas. Você pode reativar
            entrando de novo dentro do prazo de retenção.
          </p>
          {erro && <p className="mt-2 text-sm text-danger">{erro}</p>}
          <div className="mt-3 flex gap-2">
            <button
              onClick={excluir}
              disabled={ocupado}
              className="rounded-[12px] bg-danger px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {ocupado ? "Excluindo…" : "Sim, excluir"}
            </button>
            <button
              onClick={() => setConfirmando(false)}
              disabled={ocupado}
              className="rounded-[12px] border border-black/15 px-4 py-2 text-sm font-medium text-ink-soft hover:bg-black/5"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
