# CLAUDE.md — Ser Livre App

Este arquivo é lido automaticamente pelo Claude Code em toda sessão.
Contém instruções obrigatórias de workflow para este projeto.

---

## 🛠 Stack do Projeto

- **Frontend:** React + Vite (`/frontend`) — deploy via EasyPanel (clawdbot/frontend)
- **Backend:** Node.js + Express + Prisma + PostgreSQL (`/backend`) — deploy via EasyPanel (clawdbot/backend)
- **Auth:** Supabase Auth (`kajebqadlpxufgdhchxy.supabase.co`)
- **WhatsApp:** Evolution API + Google Gemini AI
- **Deploy:** GitHub push → GitHub Actions → EasyPanel auto-deploy

---

## 🤖 Ferramentas Obrigatórias

### 1. AIOX-Core (Orquestrador principal)
Repositório: https://github.com/SynkraAI/aiox-core

Instalar: `npx aiox-core install`

Usar os agentes AIOX para tarefas complexas:
- `@pm` → definição de produto / PRD
- `@architect` → arquitetura e design
- `@dev` → implementação de stories
- `@qa` → revisão e testes
- `@sm` → criação de stories detalhadas

### 2. oh-my-claudecode (Orquestração multi-agente)
Repositório: https://github.com/Yeachan-Heo/oh-my-claudecode

Instalar: `/plugin marketplace add https://github.com/Yeachan-Heo/oh-my-claudecode`

Usar palavras-chave:
- `autopilot: <tarefa>` → execução autônoma
- `ralph: <tarefa>` → modo persistência com loops de verificação
- `deepsearch` → busca focada no codebase

### 3. Claude Code Best Practices
Repositório: https://github.com/shanraisshan/claude-code-best-practice

Referência de boas práticas. Principais regras aplicadas neste projeto:
- CLAUDE.md máximo 200 linhas
- PRs pequenos e focados
- Usar subagentes para tarefas complexas
- Verificar sempre antes de committar

---

## 📋 Regras de Desenvolvimento

### Antes de qualquer mudança
1. Leia os arquivos relevantes antes de editar
2. Para bugs: identifique a causa raiz ANTES de propor solução
3. Para features: leia o contexto do módulo inteiro

### Commits e Deploy
- Todo push no `main` dispara deploy automático via GitHub Actions
- Backend: `clawdbot/backend` no EasyPanel (`xy1pmp.easypanel.host`)
- Frontend: `clawdbot/frontend` no EasyPanel
- **NÃO É NECESSÁRIO** clicar em "Implantar" manualmente — o GitHub Action cuida disso

### Debug de Erros 500
Usar o endpoint de diagnóstico (sem auth):
```
GET https://clawdbot-frontend.xy1pmp.easypanel.host/api/healthz
```
Retorna status de cada tabela do banco individualmente.

### Banco de Dados
- **Local (EasyPanel):** `postgres:5432/serlivre` — dados clínicos
- **Supabase Auth:** `kajebqadlpxufgdhchxy.supabase.co` — autenticação
- `prisma db push` roda automaticamente no startup do backend
- Schema: `backend/prisma/schema.prisma`

---

## 🔴 Problemas Conhecidos e Soluções

### 500 em todas as rotas após deploy
→ Causa: tabelas não criadas pelo `prisma db push`
→ Diagnóstico: `GET /api/healthz` para ver qual tabela falha
→ Fix: checar logs do container no EasyPanel

### Unique constraint em POST /api/patients
→ Causa: User com mesmo email mas id diferente já existe
→ Fix: `DELETE FROM "User" WHERE email=$1 AND id!=$2` antes do upsert

### Módulo de Mensagens sem templates
→ Causa: `GET /api/messages/templates` retornando 500 (tabela MessageTemplate)
→ Fix: garantir que `prisma db push` criou a tabela

---

## 📁 Estrutura de Arquivos Críticos

```
backend/
  src/server.js          ← API principal (~1600 linhas)
  src/middleware/auth.js ← autenticação Supabase
  src/utils/whatsapp.js  ← Evolution API + Gemini
  src/lib/prisma.js      ← singleton do Prisma client
  prisma/schema.prisma   ← definição das tabelas

frontend/
  src/App.jsx            ← app React (~3500 linhas)
  src/utils/api.js       ← chamadas ao backend

.github/workflows/
  deploy.yml             ← auto-deploy no push para main
```
