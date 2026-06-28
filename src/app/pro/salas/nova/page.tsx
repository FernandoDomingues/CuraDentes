import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Container from "@/components/Container";
import { carregarMinhasSalas } from "../acoes";
import SalaEditor from "../SalaEditor";

export const dynamic = "force-dynamic";

export default async function NovaSalaPage() {
  const { enderecos } = await carregarMinhasSalas();

  return (
    <Container className="py-10 md:py-12">
      <Link
        href="/pro/salas"
        className="mb-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={16} /> Minhas salas
      </Link>
      <h1 className="mb-6 text-[24px] font-bold text-brand-navy">Anunciar sala</h1>

      {enderecos.length === 0 ? (
        <p className="text-[15px] text-ink-soft">
          Cadastre um endereço de clínica no seu{" "}
          <Link href="/pro/perfil" className="font-semibold text-brand-blue hover:underline">
            perfil
          </Link>{" "}
          antes de anunciar uma sala.
        </p>
      ) : (
        <SalaEditor enderecos={enderecos} />
      )}
    </Container>
  );
}
