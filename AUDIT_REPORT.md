# Relatório de Auditoria Completa — Ser Livre App
**Data:** 2026-03-29 | **Auditores:** 8 agents AIOX em paralelo
**Status geral:** ✅ Problemas críticos de segurança CORRIGIDOS neste commit

---

## ✅ CORRIGIDO NESTE COMMIT

| # | Problema | Categoria | Commit |
|---|----------|-----------|--------|
| 1 | IDOR: paciente via /api/scores/:cycleId acessava ciclos alheios | Segurança | ✅ |
| 2 | IDOR: paciente via /api/weekchecks/:cycleId acessava checklists alheias | Segurança | ✅ |
| 3 | Paciente podia resolver alertas médicos (PATCH /api/alerts/:id/resolve) | Segurança | ✅ |
| 4 | Paciente via GET /api/appointments via todos os agendamentos de todos | Segurança | ✅ |
| 5 | Qualquer usuário podia criar agendamentos (POST /api/appointments) | Segurança | ✅ |
| 6 | Paciente via GET/POST /api/messages — mensagens de outros pacientes | Segurança | ✅ |
| 7 | parseInt NaN bug em onlyOwnData middleware (slug como param quebrava) | Bug Auth | ✅ |
| 8 | fetch('/api/state/messages') — rota inexistente, falha silenciosa | Bug Frontend | ✅ |
| 9 | saveToApi('messages') — PUT /api/state/messages nunca existiu | Bug Frontend | ✅ |
| 10 | handleCreatePatient inserindo paciente fake com id: Date.now() | Bug Frontend | ✅ |
| 11 | handleDeletePatient: delete optimista sem rollback | Bug Frontend | ✅ |
| 12 | handleChangePlan: sem toast em caso de erro | Bug Frontend | ✅ |
| 13 | PDF: data hardcoded "/2026" — errado a partir de 2027 | Bug Frontend | ✅ |
| 14 | addLog: usuário hardcoded "Dra. Mariana Wogel" | Bug Frontend | ✅ |
| 15 | genCL(): Math.random() para estado do checklist — muda a cada render | Bug Clínico | ✅ |
| 16 | WeighInModal: alert() nativo — UX ruim, bloqueia thread | UX | ✅ |
| 17 | Date.now() como ID → colisões de key React | Bug Frontend | ✅ |
| 18 | CRON semanal: N updates sequenciais → 1 updateMany (N+1) | Performance | ✅ |
| 19 | POST /api/scores: loop de alert.create sem transação | Performance | ✅ |
| 20 | Dois PrismaClient → pool exhaustion possível | DevOps | ✅ |
| 21 | Sem health check endpoint para Docker/EasyPanel | DevOps | ✅ |
| 22 | Sem graceful shutdown (SIGTERM/SIGINT) | DevOps | ✅ |

---

## 🔴 CRÍTICO — Precisa corrigir antes de ir para produção

### [SEC-01] Senha hardcoded SeedPass123! no código-fonte
**Arquivo:** `backend/src/server.js` ~linha 993
**Problema:** A senha padrão do seed está no repositório git. Se os 6 usuários criados pelo seed não mudaram a senha, qualquer pessoa com acesso ao repositório pode logar como ADMIN ou MEDICA.
**Ação imediata:**
1. No Supabase Dashboard → Authentication → Users, force reset de senha para todos os usuários de seed
2. Remover a senha do código e usar `supabaseAdmin.auth.admin.generateLink({ type: 'invite', email })` sem `password`

### [SEC-02] Links de convite e reset expostos em logs do servidor
**Arquivo:** `backend/src/utils/mailer.js` linhas 32 e 60
**Problema:** Quando SMTP não está configurado, o link completo de convite/reset (com token) é impresso no `console.log`. Em produção, esses logs aparecem no EasyPanel e qualquer pessoa com acesso ao painel pode coletar o token.
**Ação:** Remover `console.log` com token em `NODE_ENV === 'production'`.

### [SEC-03] Endpoint /api/seed exposto em produção
**Arquivo:** `backend/src/server.js` ~linha 985
**Problema:** Qualquer pessoa pode chamar `POST /api/seed`. Mesmo com o guard `count > 0`, é superfície de ataque.
**Ação:** Adicionar `requireRole('ADMIN')` ou remover em produção.

---

## 🟡 IMPORTANTE — Sprint próxima

### [DEV-01] App.jsx 3010+ linhas — impossível manter
Um único arquivo com 22+ componentes, 15+ estados, constantes, mocks e toda a lógica. Conflitos de merge são inevitáveis com 2+ devs.
**Solução:** Separar progressivamente:
- `components/patients/` → PList, PDetail, RelTab
- `components/modals/` → NewLeadModal, NewMemberModal
- `pages/` → Dash, Agenda, TeamP, Mensagens
- `utils/normalizePatient.js` (já tem parte da lógica)
- `constants/theme.js` → G, S, W, PLANS, TIER

### [DEV-02] React Router instalado mas nunca usado
`react-router-dom@6.27.0` está no `package.json` mas nunca importado. O botão Voltar do browser não funciona. Links não são compartilháveis.
**Solução:** Migrar para `createBrowserRouter` em `main.jsx` — trabalho de ~4h.

### [ARCH-01] Backend server.js 1100+ linhas sem camada de serviço
Toda lógica de negócio misturada com camada HTTP. Impossível testar unitariamente.
**Solução gradual:** Criar `src/routes/` e `src/services/` progressivamente.

### [DATA-01] GET /api/patients sem paginação
Com 100+ pacientes, o endpoint retorna tudo de uma vez incluindo todos os ciclos, scores e weekChecks.
**Ação:** Adicionar `take` e `skip` com query params `?page=1&pageSize=20`.

### [DATA-02] GET /api/dashboard carrega todos os pacientes + weekChecks em memória
Carrega ~3200 registros para calcular engajamento médio em JavaScript.
**Ação:** Mover cálculo de engagement para SQL (agregação no banco).

### [DATA-03] DELETE /api/patients/:id — race condition Auth vs Prisma
Se Supabase Auth deletar com sucesso mas Prisma falhar → registro órfão no banco.
**Ação:** Inverter ordem: deletar no Prisma primeiro, depois no Supabase Auth.

### [UX-01] handleDeletePatient sem confirmação visual
Médica clica excluir e some imediatamente. Sem diálogo de confirmação.
**Ação:** Adicionar modal de confirmação antes do delete.

### [UX-02] Sem loading state durante reloadPatients
Após salvar pesagem, o usuário não vê feedback de que a lista está sendo recarregada.
**Ação:** Estado `loading` com spinner durante chamadas de reload.

### [UX-03] Toast sem botão de fechar e sem acessibilidade
O `<Toast>` desaparece em 4s sem opção de fechar. Não tem `role="alert"` ou `aria-live`.
**Ação:** Adicionar `×` de fechar e atributos ARIA.

### [UX-04] Dois sistemas de Toast paralelos (mobile vs desktop)
O componente `<Toast>` importado existe mas um toast inline duplicado existe no render mobile. Inconsistência visual.
**Ação:** Unificar usando apenas o componente importado.

### [QA-01] Cobertura de testes: 8%
Apenas `auth.test.js` existe. Nenhum teste de roles, integração, ou componente.
**Ação Sprint 2:** Testes de role-authorization (PACIENTE não acessa dados de outro).

---

## 🟢 MELHORIAS — Sprint 2+

### [PM-01] Módulo de prescrições/protocolos ausente
A Dra. Mariana não tem onde registrar protocolos de tirzepatida por paciente no sistema.

### [PM-02] LGPD: sem tela de consentimento
Pacientes aceitam termos onde? Não há registro de consentimento no banco.
**Ação:** Adicionar campo `consentAt` no Patient e tela de aceite no portal do paciente.

### [PM-03] Calendário sem horários
Consultas sem hora. Impossível fazer agenda real do dia.
**Ação:** Adicionar campo `time` ao modelo Appointment.

### [DATA-04] Índices de FK ausentes no banco
FKs sem índice = table scan em cada join. Adicionar:
```sql
CREATE INDEX IF NOT EXISTS idx_cycles_patient_id ON cycles(patient_id);
CREATE INDEX IF NOT EXISTS idx_week_checks_cycle_id ON week_checks(cycle_id);
CREATE INDEX IF NOT EXISTS idx_score_entries_cycle_id ON score_entries(cycle_id);
CREATE INDEX IF NOT EXISTS idx_alerts_patient_id ON alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_patient_id ON message_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_member_id ON activity_logs(member_id);
```

### [ARCH-02] Ausência de global state management
Prop drilling profundo (até 4 níveis). Re-renders desnecessários a cada save de score.
**Solução:** Zustand — mínimo de boilerplate, sem Provider hell.

### [ARCH-03] Computações pesadas sem useMemo no Dash
`genSC(ps)`, `compHist`, `wbw` recalculados em cada render.
**Ação:** `useMemo(() => genSC(ps), [ps])`.

### [UX-05] Portal do paciente read-only
Paciente vê progresso mas não pode reportar sintomas ou fazer checklist.
**Oportunidade:** Adicionar checklist interativo e campo de dúvidas no portal.

---

## O que está bem — não mudar

- ✅ Schema Prisma bem modelado e normalizado
- ✅ Auth Supabase com JWT — correto
- ✅ bcrypt, helmet, CORS, rate limiting — sólido
- ✅ Convite por e-mail com token hash
- ✅ Lógica de scores clínicos (calcularMetabolico, calcularBemEstar, calcularMental)
- ✅ Geração de alertas automáticos por score
- ✅ html2pdf para relatório PDF
- ✅ recharts para gráficos
- ✅ CRON de lembretes WhatsApp (appointment reminders)
- ✅ MessageLog persistindo mensagens
- ✅ ActivityLog para rastreio de ações
- ✅ express.json limit 15mb configurado
- ✅ ResetPassword com Supabase Auth

---

## Prioridade de Execução Recomendada

| Sprint | Itens | Esforço |
|--------|-------|---------|
| HOJE | SEC-01 (reset senhas seed), SEC-02 (log tokens), SEC-03 (/api/seed) | 30min |
| Sprint 1 | DATA-01 (paginação), DATA-02 (dashboard SQL), DATA-03 (delete order), DATA-04 (índices SQL), UX-01 (confirm delete), UX-02 (loading state), UX-03/04 (Toast unify) | 1 semana |
| Sprint 2 | DEV-01 (split App.jsx), DEV-02 (React Router), QA-01 (testes de roles), PM-02 (LGPD consent) | 1-2 semanas |
| Sprint 3 | ARCH-01 (backend routes), ARCH-02 (Zustand), PM-01 (prescrições), PM-03 (agenda horários) | 2 semanas |
