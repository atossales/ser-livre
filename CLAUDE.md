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

## 🎯 Hierarquia de Orquestração

```
GSD (orquestrador de Sprints)
  ↓ usa especialistas
  AIOX agents (@dev, @qa, @sm, @architect, @pm)
  ↓ para tarefas ad-hoc rápidas
  OMC — oh-my-claudecode (autopilot, /team)
```

**Regra:** superpowers está instalado mas é REDUNDANTE — usar GSD no lugar.

---

## 1. GSD — Orquestrador Principal de Sprints

**Comandos do fluxo completo:**

```
/gsd:new-project          → cria roadmap inicial do projeto (1x)
/gsd:discuss-phase        → trava decisões antes de planejar
/gsd:plan-phase           → gera PLAN.md com tasks em waves paralelas
/gsd:execute-phase        → executa atomicamente com commit por task
/gsd:verify-work          → verifica se o objetivo foi atingido
/gsd:debug                → investiga bug com método científico
/gsd:map-codebase         → documenta estrutura do código antes de refatorar
```

**Quando usar cada um:**
- Nova feature → `/gsd:discuss-phase` → `/gsd:plan-phase` → `/gsd:execute-phase` → `/gsd:verify-work`
- Bug crítico → `/gsd:debug`
- Antes de refatorar App.jsx → `/gsd:map-codebase`
- Início de Sprint → `/gsd:discuss-phase` para travar escopo

---

## 2. AIOX Agents — Especialistas (chamados pelo GSD ou diretamente)

```
@aiox-pm        → PRD, roadmap, decisões de produto
@aiox-architect → arquitetura, banco, decisões técnicas
@aiox-dev       → implementação autônoma de stories (YOLO mode)
@aiox-sm        → criação de stories com critérios de aceite
@aiox-qa        → revisão, testes, análise de bugs
@aiox-ux        → frontend, componentes, acessibilidade
@aiox-devops    → CI/CD, git, deploy, PR automation
```

**Regra:** Para qualquer funcionalidade clínica nova, criar story com `@aiox-sm` antes de implementar.

---

## 3. OMC — oh-my-claudecode (tarefas ad-hoc)

**Quando usar:** tarefas rápidas que não justificam abrir um Sprint GSD completo.

```
autopilot: <tarefa>    → execução autônoma com loop de verificação
ralph: <tarefa>        → modo persistência com checkpoints
/team 3:executor       → 3 workers em paralelo para a mesma tarefa
deepsearch             → busca profunda no codebase
```

---

## 📋 Regras de Desenvolvimento

### Antes de qualquer mudança
1. Leia os arquivos relevantes antes de editar
2. Bugs: identifique a causa raiz ANTES de propor solução
3. Features com >2 arquivos → `/gsd:discuss-phase` antes de começar
4. Não adicionar features além do que foi pedido

### Commits e Deploy
- Todo push no `main` dispara deploy automático via GitHub Actions
- **OBRIGATÓRIO:** `cd frontend && npm run build` antes de commitar
- **OBRIGATÓRIO:** `git add -f frontend/dist/` — dist é commitado e servido pelo EasyPanel
- EasyPanel "restart" é suficiente após push (não precisa rebuild Docker)

### Multi-conta Claude Code
- Conta Danilo: `claude` (padrão, `~/.claude/`)
- Conta Mariana: `CLAUDE_CONFIG_DIR=~/.claude-serlivre claude`
- Ambas compartilham skills/agents/commands via symlinks

---

## 🔴 Problemas Conhecidos e Soluções

### WhatsApp desconectado dentro do Docker
→ Fix: definir `EVOLUTION_API_INTERNAL_URL=http://evolution-evolution-api:8080` no .env

### selPatient sem phone (botão WhatsApp não aparece)
→ Fix: sempre usar `selPatient?.phone` (sem `.user`)

### EasyPanel não atualiza após push
→ Fix: `cd frontend && npm run build && cd .. && git add -f frontend/dist/ && git commit && git push`

### 500 em todas as rotas após deploy
→ Diagnóstico: `GET /api/healthz` → checar logs do container no EasyPanel

---

## 📁 Estrutura de Arquivos Críticos

```
backend/
  src/server.js          ← API principal
  src/middleware/auth.js ← autenticação Supabase
  src/utils/whatsapp.js  ← Evolution API + Gemini
  prisma/schema.prisma   ← definição das tabelas

frontend/
  src/App.jsx            ← app React (arquivo único)
  src/utils/api.js       ← chamadas ao backend
  dist/                  ← build commitado — SEMPRE rebuildar antes de push

~/.claude/
  commands/gsd/   ← 50+ subcomandos GSD
  commands/AIOX/  ← comandos AIOX
  agents/         ← 77 agentes (gsd-*, aiox-*, architect, etc.)
  skills/         ← 200+ skills
```
