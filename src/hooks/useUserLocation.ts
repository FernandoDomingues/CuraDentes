// ═══════════════════════════════════════════════════════════════════════════════
// HOOK DE GEOLOCALIZAÇÃO DO USUÁRIO
//
// Responsável por solicitar permissão e capturar as coordenadas geográficas
// do usuário ao entrar no site. O usuário deve autorizar explicitamente via
// prompt nativo do navegador (Geolocation API).
//
// STATUS ATUAL: Coleta de coordenadas ATIVA, envio ao banco INATIVO.
// Para ativar o envio de dados ao backend, siga as instruções nos comentários
// da seção "COLETA PARA ESTATÍSTICAS".
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";

/** Estrutura retornada pelo hook */
export interface UserLocationState {
  /** Latitude do usuário (nula enquanto não autorizado ou em loading) */
  latitude: number | null;
  /** Longitude do usuário */
  longitude: number | null;
  /** true enquanto aguardando resposta do prompt de permissão */
  carregando: boolean;
  /** Mensagem de erro caso a permissão seja negada ou ocorra falha */
  erro: string | null;
  /** Status da permissão: idle | autorizado | negado | indisponivel */
  statusPermissao: "idle" | "autorizado" | "negado" | "indisponivel";
}

/**
 * useUserLocation
 *
 * Solicita permissão de geolocalização ao carregar o componente que o utiliza.
 * Captura latitude e longitude com precisão razoável (não usa GPS de alta precisão
 * para não impactar a bateria do usuário).
 *
 * Uso:
 *   const { latitude, longitude, statusPermissao } = useUserLocation();
 */
export function useUserLocation(): UserLocationState {
  // Estado inicial com valores nulos
  const [state, setState] = useState<UserLocationState>({
    latitude: null,
    longitude: null,
    carregando: false,
    erro: null,
    statusPermissao: "idle",
  });

  useEffect(() => {
    // Verifica se o navegador suporta a Geolocation API
    if (!navigator.geolocation) {
      setState((s) => ({
        ...s,
        erro: "Geolocalização não suportada por este navegador.",
        statusPermissao: "indisponivel",
      }));
      return;
    }

    // Inicia o carregamento — exibe o prompt nativo de permissão ao usuário
    setState((s) => ({ ...s, carregando: true }));

    // Configurações da requisição de localização
    const opcoes: PositionOptions = {
      enableHighAccuracy: false, // false = usa WiFi/rede, consome menos bateria
      timeout: 10000,            // 10 segundos de espera
      maximumAge: 60000,         // Aceita cache de até 1 minuto
    };

    // Callback de sucesso — usuário autorizou o compartilhamento
    const aoAutorizar = (posicao: GeolocationPosition) => {
      const { latitude, longitude } = posicao.coords;

      setState({
        latitude,
        longitude,
        carregando: false,
        erro: null,
        statusPermissao: "autorizado",
      });

      // ─────────────────────────────────────────────────────────────────────
      // COLETA PARA ESTATÍSTICAS — FEATURE INATIVA
      //
      // Quando ativado, este trecho enviará as coordenadas ao banco de dados
      // para uso em análises de demanda geográfica (ex: heatmap de buscas,
      // identificar regiões sem dentistas cadastrados, etc.).
      //
      // IMPORTANTE: Antes de ativar, certifique-se de:
      //   1. Incluir a coleta de localização nos Termos de Uso e Política de
      //      Privacidade do CuraDentes.
      //   2. Obter consentimento explícito separado (checkbox ou modal de aceite).
      //   3. Garantir anonimização (não vincular lat/lon ao usuário identificado).
      //
      // Para ativar:
      //   - Remova os comentários abaixo
      //   - Crie a tabela `logs_geolocalizacao` no Supabase com os campos:
      //       id (uuid), latitude (float8), longitude (float8),
      //       criado_em (timestamptz), session_id (text)
      //   - Importe o cliente Supabase: import { supabase } from "@/lib/supabase"
      //
      // supabase
      //   .from("logs_geolocalizacao")
      //   .insert({
      //     latitude,
      //     longitude,
      //     session_id: crypto.randomUUID(),   // identificador anônimo de sessão
      //     criado_em: new Date().toISOString(),
      //   })
      //   .then(({ error }) => {
      //     if (error) console.warn("[CuraDentes] Falha ao registrar localização:", error.message);
      //   });
      // ─────────────────────────────────────────────────────────────────────

      console.log(
        "[CuraDentes] Localização capturada — lat:",
        latitude.toFixed(4),
        "lon:",
        longitude.toFixed(4)
      );
    };

    // Callback de erro — usuário negou ou ocorreu falha técnica
    const aoNegar = (erro: GeolocationPositionError) => {
      const mensagens: Record<number, string> = {
        1: "Permissão de localização negada pelo usuário.",
        2: "Localização indisponível no momento.",
        3: "Tempo de espera esgotado ao obter localização.",
      };

      setState({
        latitude: null,
        longitude: null,
        carregando: false,
        erro: mensagens[erro.code] ?? "Erro desconhecido ao obter localização.",
        statusPermissao: erro.code === 1 ? "negado" : "indisponivel",
      });

      console.warn("[CuraDentes] Localização não obtida:", mensagens[erro.code]);
    };

    // Dispara a solicitação ao navegador
    navigator.geolocation.getCurrentPosition(aoAutorizar, aoNegar, opcoes);
  }, []); // Executa apenas uma vez ao montar o componente

  return state;
}
