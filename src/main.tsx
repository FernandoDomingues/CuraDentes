import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App.tsx'
import './index.css'

// ============================================================================
// CONFIGURAÇÃO DO GOOGLE SIGN-IN CLIENT ID
// ============================================================================
// O "Client ID" é a chave de identidade que conecta o nosso site aos servidores do Google.
// 1. O sistema tenta ler a chave configurada no arquivo '.env' (VITE_GOOGLE_CLIENT_ID).
// 2. Se a chave não estiver configurada no arquivo '.env', nós usamos uma chave de testes 
//    padrão para garantir que o site funcione e compile localmente sem travar.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "1007898867375-7vdfc7b0s8om22v0k6j72pmsf9i3l119.apps.googleusercontent.com";

// Envolvemos a aplicação inteira (<App />) com o <GoogleOAuthProvider>.
// Isso permite que qualquer botão ou formulário dentro do site possa disparar o login do Google de forma simples.
createRoot(document.getElementById("root")!).render(
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <App />
  </GoogleOAuthProvider>
);
