# Security Audit — Ser Livre Backend

## Status: 2026-03-27

---

### OK

- **Helmet habilitado**: `helmet()` está ativo em todas as rotas, adicionando headers de segurança padrão (X-Content-Type-Options, X-Frame-Options, HSTS, etc). CSP desabilitado intencionalmente (`contentSecurityPolicy: false`) — avaliar se necessário.
- **CORS configurado corretamente**: Origins controladas via `ALLOWED_ORIGINS` (env var). Em desenvolvimento aceita requisições sem origin (curl/Postman), mas bloqueia origins não listadas em produção. Padrão correto.
- **Rate limiting em rotas de auth**: `authLimiter` (20 req/15min) aplicado em `POST /api/auth/login` e `POST /api/auth/forgot-password`.
- **Rate limiting agressivo no `/api/seed`**: `seedLimiter` (3 req/hora) aplicado. Rota protegida por `SEED_SECRET` comparada via `===` com a variável de ambiente.
- **Seed protegido por secret**: `/api/seed` verifica `adminSecret !== process.env.SEED_SECRET` e retorna 403. Sem o secret correto, acesso é negado.
- **Supabase Auth como validação de token**: `authRequired` valida o JWT via `supabaseAdmin.auth.getUser(token)` — sem implementação manual de JWT (menos superfície de ataque).
- **Usuário inativo bloqueado**: `authRequired` verifica `user.active` — usuários desativados não conseguem autenticar mesmo com token válido.
- **Prisma ORM**: Queries parametrizadas por padrão — SQL injection via Prisma é praticamente impossível com uso correto de `findUnique`, `findMany`, `create`, `update`, `delete`. Nenhum uso de `$queryRaw` sem sanitização foi identificado.
- **Validação de input nas rotas críticas**: `POST /api/auth/login` exige email e senha; `POST /api/patients` valida `name`, `email`, `initialWeight` (número positivo) e `birthDate` (data válida); `PUT /api/users/:id/password` exige senha com mínimo 8 caracteres.
- **Paciente não acessa dados de outros pacientes via `/api/patients`**: A query em `GET /api/patients` filtra por `{ userId: req.user.id }` quando `role === 'PACIENTE'` — paciente só vê seu próprio registro.
- **Paciente não vê dados de outros via `/api/patients/:id`**: Middleware `onlyOwnData` aplicado — verifica se `patientId` do parâmetro corresponde ao do usuário logado.
- **Alertas filtrados por paciente**: `GET /api/alerts` filtra por `patient.userId` quando o usuário é PACIENTE.
- **Acesso ao dashboard bloqueado para pacientes**: `GET /api/dashboard` usa `requireRole(...)` excluindo PACIENTE explicitamente.
- **Upload de avatar com validação de tipo e tamanho**: Apenas JPEG, PNG e WebP aceitos; limite de 5MB via `multer`.
- **Morgan para logging**: Todas as requisições são logadas (formato `combined`), facilitando auditoria.
- **Senha com mínimo de 8 caracteres**: Validada em `PUT /api/users/:id/password`.
- **Esqueceu senha não revela se e-mail existe**: Resposta genérica independente de o e-mail existir ou não.

---

### Atencao

- **`contentSecurityPolicy: false`**: O helmet está desabilitado para CSP. Pode expor o backend a ataques XSS em endpoints que servem HTML. Avaliar se alguma rota serve HTML diretamente.
- **`app.options('*', cors())`**: Pre-flight CORS sem restrições de origem. Embora o handler principal valide a origin, este middleware pré-voo aceita qualquer origem. Risco baixo, mas pode ser afinado.
- **`GET /api/patients/:id/cycles` sem `onlyOwnData`**: A rota (linha 464) usa `authRequired` mas não aplica `onlyOwnData`. Um paciente autenticado pode consultar ciclos de outro paciente se souber o ID. Risco médio.
- **`GET /api/scores/:cycleId` sem verificação de propriedade**: Qualquer usuário autenticado pode buscar scores de qualquer ciclo pelo ID. Paciente poderia acessar dados de outro paciente se souber o cycleId.
- **`GET /api/weekchecks/:cycleId` sem verificação de propriedade**: Mesma situação — qualquer autenticado pode buscar checklists de qualquer ciclo.
- **`PATCH /api/alerts/:id/resolve` sem restrição de role**: Qualquer usuário autenticado (incluindo PACIENTE) pode resolver alertas de qualquer paciente. Risco médio.
- **`GET /api/appointments` sem filtro por paciente**: Pacientes podem ver todos os agendamentos do sistema, não apenas os seus.
- **`POST /api/appointments` sem restrição de role**: Qualquer usuário autenticado pode criar agendamentos.
- **`PUT /api/users/:id/role` sem validação de role válida**: O campo `role` aceita qualquer string. Um ADMIN/MEDICA poderia promover um usuário para um role inválido ou inexistente.
- **Uploads servidos via `/uploads` estático sem autenticação**: Qualquer um pode acessar avatars se souber o nome do arquivo (`avatar-<timestamp>.<ext>`). Risco baixo para avatars, mas avaliar se a pasta pode ter outros arquivos.
- **Seed expõe senha padrão no código**: `'SeedPass123!'` está hardcoded no seed. Embora seja apenas para o seed inicial, esta senha deve ser alterada imediatamente após o setup.
- **`onlyOwnData` só verifica `req.params.patientId`**: Se a rota usar `:id` ao invés de `:patientId`, o middleware NÃO protege. Confirmar nomenclatura consistente de params.

---

### Critico

- **`GET /api/state/:key` e `PUT /api/state/:key` SEM AUTENTICACAO**: As rotas de StateBlob (linhas 808-828) não têm `authRequired`. Qualquer pessoa sem token pode ler ou sobrescrever qualquer chave do `stateBlob`. Se usado para armazenar dados sensíveis de sessão ou configurações, isso é uma vulnerabilidade grave.
  - **Acao imediata requerida**: Adicionar `authRequired` ou, se a rota for intencional para uso público (ex: mensagens de status), documentar explicitamente e garantir que nenhum dado sensível seja armazenado.
- **`onlyOwnData` nao protege PACIENTE em `/api/patients/:id/cycles`**: A rota `/api/patients/:id/cycles` usa o parâmetro `:id`, mas `onlyOwnData` verifica apenas `req.params.patientId`. Como o param se chama `:id`, o middleware passa sem validar. PACIENTE pode acessar ciclos de qualquer outro paciente.

---

### Recomendacoes

1. **URGENTE — StateBlob sem auth**: Adicionar `authRequired` em `GET /api/state/:key` e `PUT /api/state/:key`, ou restringir por role. Se for para dados públicos, criar uma rota separada e explicitamente pública com chaves prefixadas (ex: `public_*`).

2. **URGENTE — onlyOwnData incompleto**: Renomear o parâmetro de `/api/patients/:id/cycles` para `:patientId`, ou adicionar lógica de verificação de propriedade diretamente na rota usando `req.params.id`. O mesmo se aplica a `/api/scores/:cycleId` e `/api/weekchecks/:cycleId`.

3. **Adicionar verificação de propriedade em scores e weekchecks**: Antes de retornar dados, verificar se o `cycleId` pertence ao paciente logado quando `role === 'PACIENTE'`.

4. **Restringir resolução de alertas por role**: `PATCH /api/alerts/:id/resolve` deve exigir role de equipe (não PACIENTE).

5. **Filtrar agendamentos por paciente**: `GET /api/appointments` deve filtrar quando `role === 'PACIENTE'`.

6. **Validar role em `PUT /api/users/:id/role`**: Aceitar apenas roles válidos do enum (`ADMIN`, `MEDICA`, `ENFERMAGEM`, `NUTRICIONISTA`, `PSICOLOGA`, `TREINADOR`, `PACIENTE`).

7. **Alterar senha do seed imediatamente**: A senha `SeedPass123!` é conhecida (está no código-fonte). Após o seed inicial, forçar troca de senha ou gerar convites.

8. **Considerar HTTPS em produção**: Confirmar que o servidor está atrás de proxy reverso (Nginx/Traefik) com TLS. O `helmet` adiciona o header `Strict-Transport-Security` mas o TLS precisa ser configurado na infraestrutura.

9. **Considerar CSP**: Reativar `contentSecurityPolicy` no helmet com uma política adequada se o backend servir qualquer HTML.

10. **Adicionar `requireRole` em `POST /api/appointments`**: Limitar criação de agendamentos a roles da equipe.

11. **Proteção de uploads**: Considerar servir avatars com autenticação ou mover para Supabase Storage com URLs assinadas.

12. **Adicionar testes de autorização**: Os testes em `backend/src/__tests__/auth.test.js` cobrem smoke tests básicos. Expandir com testes de autorização cruzada (ex: paciente tentando acessar dados de outro paciente).
