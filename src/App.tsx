import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";

import Index from "@/pages/Index";
import Pesquisa from "@/pages/Pesquisa";
import NotFound from "@/pages/NotFound";
import DentistProfile from "@/pages/DentistProfile";
import NovoCadastro from "@/pages/pro/NovoCadastro";
import Dashboard from "@/pages/pro/Dashboard";
import MeuPerfil from "@/pages/pro/MeuPerfil";

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/pesquisa" element={<Pesquisa />} />
        <Route path="/dentista/:id" element={<DentistProfile />} />
        <Route path="/pro/novo-cadastro" element={<NovoCadastro />} />
        <Route path="/pro/dashboard" element={<Dashboard />} />
        <Route path="/pro/perfil" element={<MeuPerfil />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
