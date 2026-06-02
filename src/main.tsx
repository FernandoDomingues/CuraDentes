// ═══════════════════════════════════════════════════════════════════════════════
// PONTO DE ENTRADA DA APLICAÇÃO
//
// Responsabilidades:
//   1. Cria a root do React 18 (createRoot)
//   2. Envolve <App /> em <React.StrictMode> — em dev, monta o componente
//      duas vezes para detectar side effects. Por isso o useAuth faz
//      cleanup explícito da subscription (ver src/hooks/useAuth.ts).
//   3. Carrega os estilos globais (index.css com Tailwind + shadcn).
//
// O que NÃO é responsabilidade deste arquivo:
//   - Inicializar Supabase (feito em src/lib/supabase.ts, importado lazy
//     pelo primeiro hook/função que usar)
//   - Inicializar auth (feito por useAuth().initialize() dentro do App)
// ═══════════════════════════════════════════════════════════════════════════════

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
