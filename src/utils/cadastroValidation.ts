// ═══════════════════════════════════════════════════════════════════════════════
// CADASTRO VALIDATION — Regras de validação do cadastro Pro
//
// Fonte da verdade para validação de todas as etapas do cadastro do dentista.
// Centralizado aqui para ser reutilizado tanto pelo frontend (NovoCadastro.tsx)
// quanto pelos testes de unidade (tests/cadastro/validation.test.ts) — TDD.
//
// Etapas:
//   1. Conta (nome, email, senha)
//   2. Telefone (DDD + 9 dígitos)
//   3. Identidade (CPF módulo 11 + CRO por UF)
//   4. Endereços (logradouro, bairro, cidade, estado, CEP)
//   5. Bio (opcional — sempre concluída)
//   6. LGPD (consentimento obrigatório)
// ═══════════════════════════════════════════════════════════════════════════════

export function validarTelefone(valor: string): boolean {
  const numeros = valor.replace(/\D/g, "");
  return numeros.length === 11 && numeros.charAt(2) === "9";
}

export function validarCpf(valor: string): boolean {
  const numeros = valor.replace(/\D/g, "");
  if (numeros.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(numeros)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(numeros.charAt(i)) * (10 - i);
  }
  let resto = soma % 11;
  const digito1 = resto < 2 ? 0 : 11 - resto;
  if (parseInt(numeros.charAt(9)) !== digito1) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(numeros.charAt(i)) * (11 - i);
  }
  resto = soma % 11;
  const digito2 = resto < 2 ? 0 : 11 - resto;
  if (parseInt(numeros.charAt(10)) !== digito2) return false;

  return true;
}

export function validarCro(valor: string): boolean {
  const ufsValidas = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
    "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
  ];
  const regex = /^CRO-([A-Z]{2})(\d{3,6})$/;
  const match = valor.toUpperCase().match(regex);
  if (!match) return false;
  const uf = match[1];
  return ufsValidas.includes(uf);
}

export function validarEnderecos(enderecos: any[]): { valido: boolean; erros: string[] } {
  const erros: string[] = [];
  enderecos.forEach((end, i) => {
    const prefixo = `Endereço ${i + 1}`;
    if (!end.nome_clinica || !end.nome_clinica.trim()) erros.push(`${prefixo}: Nome da clínica`);
    if (!end.logradouro || !end.logradouro.trim()) erros.push(`${prefixo}: Logradouro`);
    if (!end.bairro || !end.bairro.trim()) erros.push(`${prefixo}: Bairro`);
    if (!end.cidade || !end.cidade.trim()) erros.push(`${prefixo}: Cidade`);
    if (!end.estado || !end.estado.trim()) erros.push(`${prefixo}: Estado`);
    if (!end.cep || !end.cep.trim()) erros.push(`${prefixo}: CEP`);
  });
  return { valido: erros.length === 0, erros };
}

export function validarAnoFormacao(valor: string): boolean {
  if (!valor) return true; // opcional
  const ano = parseInt(valor, 10);
  if (isNaN(ano)) return false;
  const atual = new Date().getFullYear();
  return ano >= 1950 && ano <= atual;
}

export interface EtapaValidationParams {
  nome: string;
  emailVerificado: boolean;
  senhaSincronizada: boolean;
  senha: string;
  confirmaSenha: string;
  telefone: string;
  cpf: string;
  cro: string;
  enderecos: any[];
  lgpdAceito: boolean;
  anoFormacao?: string;
}

export function isEtapaConcluida(etapaId: number, params: EtapaValidationParams): boolean {
  switch (etapaId) {
    case 1:
      return (
        !!params.nome.trim() &&
        params.emailVerificado &&
        (params.senhaSincronizada || (params.senha.length >= 8 && params.senha === params.confirmaSenha))
      );
    case 2:
      return validarTelefone(params.telefone);
    case 3:
      return validarCpf(params.cpf) && validarCro(params.cro);
    case 4:
      return params.enderecos.length > 0 && validarEnderecos(params.enderecos).valido;
    case 5:
      return true; // Bio é opcional, então não há pendência
    case 6:
      return params.lgpdAceito;
    default:
      return false;
  }
}
