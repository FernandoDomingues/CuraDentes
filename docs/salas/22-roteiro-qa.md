# Roteiro de QA — Locação de Salas / Coworking (branch `salas-fase1`)

> **Preview:** https://curadentes-site-r0-313byowlc-cura-dentes.vercel.app
> **Prod intocado.** Só vai a produção depois que você fechar este QA e autorizar.
> Roteiro montado a partir do código real (rotas, rótulos e condições conferidos arquivo a arquivo).

---

## 0. Pré-requisitos (montar uma vez)

**Contas necessárias:**
- [ ] **Conta A** — dentista com **CRO aprovado**. Será o **DONO/LOCADOR** (ex.: `fernando.leite@outlook.com`, dono da Villa Amato).
- [ ] **Conta B** — dentista com **CRO aprovado**, e-mail diferente. Será o **LOCATÁRIO/ADERENTE**.
- [ ] **Conta C** — paciente (login Google, sem cadastro pro).
- [ ] **Visitante** — janela anônima, sem login.

**Como ligar/desligar o CRO de uma conta (no SQL Editor do Supabase):**
```sql
-- achar o id pelo e-mail/nome:
select id, nome, email, cro_verificado from curadentespro order by nome;
-- ligar:
update curadentespro set cro_verificado = true  where id = '<uuid>';
-- desligar (para testar o muro):
update curadentespro set cro_verificado = false where id = '<uuid>';
```

**Banco / função:**
- [ ] SQLs `09`…`20` aplicados (já rodados no Supabase compartilhado durante o desenvolvimento).
- [x] Edge Function `notificar-adesao-clinica` publicada (feito via CLI).
- [ ] Conta A tem **WhatsApp/telefone preenchidos** no endereço da clínica (é o contato revelado ao locatário após aprovação).
- [ ] Conta B tem **telefone e e-mail** no perfil (é o contato que o locador vê).

> ⚠️ Depois de mudar `cro_verificado` no banco, **recarregue a página** (a UI sincroniza via `/api/me` no próximo carregamento).

---

## 1. Bloco 0 — Gate de acesso (quem entra na feature)

| # | Ator | Ação | Esperado |
|---|------|------|----------|
| 0.1 | Visitante | Abrir `/coworking` direto pela URL | Muro **"Alugue uma sala odontológica"**, botão **"Entrar como dentista"** + link **"Cadastre-se"**. **Não** lista clínicas. |
| 0.2 | Visitante | Abrir `/coworking/[id]` e `/coworking/clinica/[chave]` | Mesmo muro. **Nenhum dado de clínica/sala vaza** (gate roda antes da busca). |
| 0.3 | Paciente (C) | Abrir `/coworking` | Muro **"CRO em verificação"** (não lista nada). |
| 0.4 | Paciente (C) | Abrir `/pro/dashboard` ou `/pro/negocios` | Redireciona para a **home `/`**. |
| 0.5 | Dentista SEM CRO | Abrir `/coworking` | Muro **"CRO em verificação"** + botão **"Ir para o painel"**. |
| 0.6 | Dentista SEM CRO | Abrir `/pro/negocios` (e `/nova`, `/solicitacoes`, `/historico`) | Muro **"Recurso liberado após a verificação do CRO"** + **"Voltar ao painel"**. Nada é carregado. |
| 0.7 | Dentista SEM CRO | Abrir `/pro/dashboard` | **Sem** badge "CRO verificado"; **sem** seção "Locação de salas". (Card "Pedidos de adesão" só se houver pendência — ver Bloco 4.) |
| 0.8 | Dentista COM CRO (A) | Abrir `/pro/dashboard` | Badge **"CRO verificado"**; barra lateral com **"Locação de salas"** + **"Procurar salas para alugar"**. |
| 0.9 | Dentista COM CRO (A) | Abrir `/coworking` | Passa o muro: hero de busca + grade de clínicas (ou vazio se não houver salas). |
| 0.10 | Dentista COM CRO → revogar | Rodar `update ... cro_verificado=false`, recarregar `/coworking` e `/pro/negocios` | Volta a cair nos muros. Confirma que o gate revalida a cada acesso. **Religue o CRO depois.** |

---

## 2. Bloco 1 — Anfitrião (oferta): clínica + estrutura + anunciar sala

> Use a **Conta A (CRO ok)**.

- [ ] **1.1** Sem endereço cadastrado: `/pro/negocios` → aba **"Minhas salas"** mostra **"Cadastre um endereço primeiro"** e o botão "Anunciar sala" **some**.
- [ ] **1.2** Em **`/pro/editar-perfil`**, preencher um endereço (Nome da clínica, CEP→ViaCEP, Logradouro/Número/Bairro/Cidade/Estado, Telefone/WhatsApp) e salvar.
- [ ] **1.3** Ainda no perfil, seção **"Estrutura da clínica (locação de salas)"**: marcar chips (Estacionamento, Wi-Fi, Recepção compartilhada…) e usar o campo livre **"Outras comodidades da clínica"** → conferir contador **X/150** e corte em 150 caracteres.
- [ ] **1.4** Seção **"Fotos da clínica"**: enviar **Fachada (1)** e **Recepção (até 3)**.
- [ ] **1.5** `/pro/negocios` → "Minhas salas" → **"Anunciar sala"**. Em "Onde ficam as salas", escolher o endereço no select.
- [ ] **1.6** Preencher a **Sala 1**: Título; **Equipamentos da sala** (chips: Cadeira odontológica, Raio-X, Autoclave…) + campo livre **"Outros equipamentos da sala"** (contador X/150).
- [ ] **1.7** Confirmar que **estrutura da CLÍNICA (perfil) ≠ equipamentos da SALA (anúncio)** — são listas separadas.
- [ ] **1.8** Preço: **"Valor por hora (R$)"** (ex. 120,00) e, opcional, **"Valor da diária (R$)"** (ex. 800,00). Aceita vírgula.
- [ ] **1.9** Disponibilidade: ajustar os blocos (padrão seg–sex 08:00–18:00); **Fotos da sala (1 a 3)** com ao menos 1.
- [ ] **1.10** (Opcional) **"Adicionar outra sala"** para criar 2+ de uma vez (endereço e política são compartilhados). Salvar → toast **"Sala anunciada!"/"Salas anunciadas!"**.
- [ ] **1.11** Em "Minhas salas": as salas aparecem **agrupadas por clínica** (1 card por endereço), cada sala com selo **"Sala 01/02…"**, badge **"Ativa"**, preço e link **"Ver anúncio →"**.
- [ ] **1.12** Editar uma sala (engrenagem → `/pro/negocios/[id]/editar`), alterar algo → **"Salvar alterações"** → toast "Sala atualizada!".
- [ ] **1.13** Validações (forçar erro): sem endereço/título/preço/foto → mensagens "Escolha em qual endereço…", "Dê um título…", "Informe um preço válido…", "Cada sala precisa de ao menos uma foto."

---

## 3. Bloco 2 — Catálogo (demanda): /coworking

> Use a **Conta A ou B (CRO ok)**.

- [ ] **2.1** `/coworking`: hero **"Alugue uma sala odontológica"**, busca por cidade, e grade de **cards de CLÍNICA** (não de salas), com fachada, badge **"Verificada"**, local, **"N salas"** e **"a partir de R$ X/hora"**.
- [ ] **2.2** **Agrupamento (anti-duplicidade):** com 2+ salas no **mesmo endereço físico**, aparece **UM card de clínica** (não um por sala); `N salas` correto; preço = menor por hora.
- [ ] **2.3** Buscar uma cidade → `/coworking?cidade=...`, título vira **"Clínicas em 'cidade'"**. Cidade sem dados → **"Nenhuma clínica encontrada"**.
- [ ] **2.4** Abrir uma clínica → `/coworking/clinica/[chave]`. **Conferir a ORDEM dos blocos:**
  1. "Todas as clínicas" (voltar)
  2. Nome da clínica (H1)
  3. Endereço escrito + contatos (WhatsApp/telefone)
  4. Fachada (+ recepção)
  5. **"Estrutura da clínica"** (checks verdes + "Também: …")
  6. Mapa **"Onde fica"** (botão Google Maps)
  7. **"Salas disponíveis (N)"**
  → **A estrutura da clínica vem ANTES do mapa**, e o mapa antes das salas. ✅ (isto é o que você pediu)
- [ ] **2.5** Cada sala (bloco) mostra "Sala NN" + título, fotos, **"R$ X por hora · R$ Y a diária"**, **"Equipamentos da sala"** e o box **"Solicitar um horário"**.
- [ ] **2.6** Abrir o detalhe de uma sala `/coworking/[id]`: galeria, preço grande, specs (Cobrança/Equipamentos/Dias/Cidade), "Sobre a sala", equipamentos, disponibilidade, mapa **"Localização"**, **"Contato da clínica"** e "Veja também".
- [ ] **2.7** Placeholders: sala sem foto → "Fotos em breve"; clínica sem fachada → "Foto da fachada em breve". Mapa só aparece com lat/lng.

---

## 4. Bloco 3 — Reserva ponta a ponta (A ↔ B)

> **Conta B = locatário**, **Conta A = locador**. Ambas com CRO. B **não** pode alugar a própria sala.

- [ ] **3.1** B abre `/coworking/[id]` de uma sala de A → **"Ver agenda e escolher"** → escolhe dia → 1º clique = início, 2º = fim (faixa) → **"Confirmar horário"**.
- [ ] **3.2** Aparece o resumo (data + faixa), campo **"Mensagem (opcional)"** e aviso "O pagamento é combinado direto com a clínica após a aprovação." → **"Solicitar horário"** → **"Solicitação enviada!"**.
- [ ] **3.3** B em `/pro/negocios?aba=enviadas` (**"Salas Contratadas"**): card com badge laranja **"Pendente"**, botão **"Cancelar solicitação"**, e **NENHUM contato da clínica ainda**.
- [ ] **3.4** A em `/pro/negocios?aba=recebidas` (**"Caixa de entrada"**): seção **"Aguardando sua resposta (N)"** com o pedido, mensagem, nome do solicitante, botões **"Aprovar"/"Recusar"**.
- [ ] **3.5** **Revelação de contato (regra central):** A clica **"WhatsApp / Ligar para o dentista"** → vê o contato de B **mesmo antes de decidir** (qualquer status). ✔
- [ ] **3.6** **Aprovar:** A clica **"Aprovar"** → card vira **"Aprovada"** + surge bloco âmbar de pagamento **"Confirmar pagamento recebido"**.
- [ ] **3.7** B recarrega "Salas Contratadas": badge **"Aprovada"** + botão **"Ver contato da clínica"** → só **agora** B vê o WhatsApp/telefone/e-mail da clínica. ✔ (assimetria correta)
- [ ] **3.8** A clica **"Confirmar pagamento recebido"** → vira **"Pagamento confirmado"**. B passa a ver **"Pagamento confirmado pela clínica"** (somente leitura).
- [ ] **3.9** **Recusar** (em outro pedido): A clica "Recusar" → textarea de motivo → "Confirmar recusa" → some do painel (vai ao **Histórico**); B vê **"Resposta da clínica: …"**.
- [ ] **3.10** **Cancelar:** B, num pedido **pendente**, clica "Cancelar solicitação" → vira "Cancelada" (vai ao Histórico).
- [ ] **3.11** **Horário ocupado:** após uma aprovação, o mesmo horário aparece **"Ocupado"** (riscado) e não é selecionável.
- [ ] **3.12** **Duplicidade:** B tenta repetir a mesma solicitação pendente → erro **"Você já tem uma solicitação pendente igual para esta sala."**
- [ ] **3.13** **Histórico:** `/pro/negocios/historico` mostra recusadas/canceladas (o painel mostra só pendente + aprovada).

---

## 5. Bloco 4 — Parte 3: anti-duplicidade + ADESÃO (o foco novo)

> **Conta A = dono** (já criou a clínica, ex.: Villa Amato, CEP **18087-657 nº 1**). **Conta B = aderente.**
> Faça pela tela **`/pro/editar-perfil`** (lá aparecem as fotos/estrutura travadas).

- [ ] **4.1** B, num endereço novo, digita o **MESMO CEP (8 dígitos) e número** de A → ao sair do campo Número, aparece o cartão azul **"Já existe clínica neste endereço — é a sua?"** com o nome de A e o link **"Usar este nome"**.
- [ ] **4.2** B clica **"Usar este nome"** → os campos **travam** (cinza): nome, CEP, logradouro, número, bairro, cidade, estado; **fachada/recepção** ficam só-leitura; **estrutura** (chips + texto) desabilitada. Surge o banner **"🔒 Você está aderindo a uma clínica existente…"**.
- [ ] **4.3** O **complemento** continua **livre e destacado** (borda azul) com o aviso "— é OUTRA sala/conjunto? edite aqui para diferenciar". Telefone/WhatsApp/agenda **continuam livres**.
- [ ] **4.4** B salva **sem mudar o complemento** → cria **adesão pendente** + dispara e-mail ao dono (best-effort).
- [ ] **4.5** **Pendente fica oculto:** abrir `/coworking` → o endereço de B **NÃO** aparece ainda (a clínica de A segue visível normalmente).
- [ ] **4.6** A abre `/pro/dashboard` → card vermelho **"Pedidos de adesão"** / "Dentistas querem entrar na sua clínica" com o contador. **(E o e-mail "Novo pedido de adesão…" deve chegar.)**
- [ ] **4.7** A abre `/pro/adesoes` → card com o nome de B, "clínica · complemento", "Pedido em DD/MM/AAAA", botões **"Aprovar"/"Recusar"**.
- [ ] **4.8** A clica **"Aprovar"** → card some; o endereço de B **passa a aparecer** no `/coworking`. Lista vazia mostra **"Tudo resolvido!"**. Badge do dashboard zera.
- [ ] **4.9** **Recusar** (repita com outro pedido): card some; endereço de B **continua oculto**.
- [ ] **4.10** **Variação "outra sala":** B adota e depois muda o complemento para outra unidade (ex. "402") → **destrava tudo**, o banner some; salvar cria uma **clínica distinta** (B vira dono dela, sem adesão).
- [ ] **4.11** **Variação "Não é":** B adota e clica **"Não é"** no banner → destrava os campos para preencher a própria clínica.
- [ ] **4.12** **Normalização:** "Sala 305", "sala 305", "305" caem na **mesma** clínica (continua travado/adesão). CEP < 8 dígitos ou número vazio → a sugestão **não** aparece.
- [ ] **4.13** **/pro/adesoes sem CRO:** a tela e o badge funcionam **mesmo para dono sem CRO** (adesão não é gateada por CRO).

---

## 6. Bloco 5 — Regressão rápida (não quebrou o resto)

- [ ] **5.1** Login/logout (dentista e Google/paciente) ok.
- [ ] **5.2** Busca de dentistas e página pública de um dentista ok.
- [ ] **5.3** Cadastro novo de dentista conclui (e o trigger de e-mail continua funcionando).
- [ ] **5.4** Dashboard do dentista (métricas, avaliações, endereços) carrega normal.

---

## 7. Notas / comportamentos conhecidos (NÃO são bugs)

- **Pausar/ativar/excluir sala:** a ação existe no servidor (`atualizarStatusSala`), mas **não há botão na UI** atual — o badge "Ativa/Pausada" é só leitura. Se você quiser esse controle, é um item a decidir (fácil de adicionar depois).
- **Muro do paciente em `/coworking`:** mostra "CRO em verificação" (texto pensado para dentista). O **acesso é negado corretamente**; é só o texto que não é 100% sob medida para paciente.
- **E-mail da adesão é best-effort:** se a Edge Function falhar, o save conclui e o pedido aparece em `/pro/adesoes` mesmo assim — o painel é a fonte da verdade.
- **`/pro/minhas-solicitacoes` e `/pro/negocios/solicitacoes`** são só **redirects** para as abas do painel `/pro/negocios`.

---

## 8. Ao terminar

Marque os blocos. Se tudo passar, me avise (**"pode publicar"**) e eu faço:
`merge salas-fase1 → site-r0` + `vercel --prod`. Como o Supabase é compartilhado, **não há passo extra de banco nem de função** na publicação.
