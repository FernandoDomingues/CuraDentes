"use client";

// Ações da conta no dashboard (ilha cliente): Sair e Excluir conta.
// Ambas via Server Action (logout/exclusão NO SERVIDOR — refactor do C1; o signOut
// no servidor limpa os cookies httpOnly). Mesma semântica do site-k11.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { excluirContaDentista, sairConta } from "@/lib/conta-acoes";

export default function AcoesConta() {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");

  // Pós-logout: limpa o cache otimista de login e avisa o SessaoProvider (que re-busca
  // /api/me e atualiza o cabeçalho), depois vai para a home.
  function finalizar() {
    try {
      localStorage.removeItem("cd_user");
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event("curadentes:auth"));
    router.replace("/");
    router.refresh();
  }

  async function sair() {
    setOcupado(true);
    await sairConta();
    finalizar();
  }

  async function excluir() {
    setOcupado(true);
    setErro("");
    const res = await excluirContaDentista();
    if (!res.ok) {
      setErro(res.erro || "Não foi possível excluir a conta agora. Tente novamente.");
      setOcupado(false);
      return;
    }
    finalizar();
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
