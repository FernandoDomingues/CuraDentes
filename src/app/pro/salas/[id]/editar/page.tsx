import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Container from "@/components/Container";
import { carregarMinhasSalas } from "../../acoes";
import SalaEditor from "../../SalaEditor";

export const dynamic = "force-dynamic";

export default async function EditarSalaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { enderecos, salas } = await carregarMinhasSalas();
  const sala = salas.find((s) => s.id === id);

  return (
    <Container className="py-10 md:py-12">
      <Link
        href="/pro/salas"
        className="mb-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={16} /> Minhas salas
      </Link>
      <h1 className="mb-6 text-[24px] font-bold text-brand-navy">Editar sala</h1>

      {!sala ? (
        <p className="text-[15px] text-ink-soft">Sala não encontrada ou não é sua.</p>
      ) : (
        <SalaEditor enderecos={enderecos} salaInicial={sala} />
      )}
    </Container>
  );
}
