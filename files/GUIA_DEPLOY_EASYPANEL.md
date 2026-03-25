# ══════════════════════════════════════════════════════════════
# GUIA PARA O DANILO — Deploy via GitHub no EasyPanel
# Programa Ser Livre — Instituto Dra. Mariana Wogel
# ══════════════════════════════════════════════════════════════


## ETAPA 1: Criar o repositório no GitHub

1. Acesse https://github.com/new
2. Nome do repositório: `ser-livre`
3. Marque como **Private** (os dados são sensíveis)
4. Clique "Create repository"
5. No seu Mac, abra o Terminal e rode:

```bash
cd ~/Desktop
unzip ser-livre-projeto-completo.zip
cd ser-livre

git init
git add .
git commit -m "Versão inicial do Programa Ser Livre"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/ser-livre.git
git push -u origin main
```

Troque `SEU-USUARIO` pelo seu username do GitHub.
Se pedir login, use seu token pessoal do GitHub (não a senha).


## ETAPA 2: No EasyPanel — Criar o projeto

1. Acesse seu painel EasyPanel
2. Clique em **"+ Novo Projeto"**
3. Nome do projeto: `ser-livre`


## ETAPA 3: Criar o banco de dados PostgreSQL

Dentro do projeto `ser-livre`:

1. Clique **"+ Serviço" → "Banco de dados" → "PostgreSQL"**
2. Configure:
   - Nome: `postgres`
   - Versão: `16`
   - Usuário: `serlivre`
   - Senha: `MarianaWogel@` (a mesma do .env)
   - Database: `serlivre`
3. Clique **"Implantar"**
4. Anote a **string de conexão** interna que o EasyPanel gerar.
   Vai ser algo como:
   `postgresql://serlivre:MarianaWogel@@postgres.ser-livre.svc.cluster.local:5432/serlivre`
   
   OU pode ser no formato:
   `postgresql://serlivre:MarianaWogel@@ser-livre_postgres:5432/serlivre`

   O formato exato depende da versão do EasyPanel. Copie o que aparecer.


## ETAPA 4: Criar o serviço Backend (API)

Dentro do projeto `ser-livre`:

1. Clique **"+ Serviço" → "App"**
2. Nome: `backend`
3. **Fonte: GitHub**
   - Conecte sua conta GitHub (se ainda não conectou)
   - Selecione o repositório `ser-livre`
   - Branch: `main`
   - **Diretório raiz: `/backend`** ← IMPORTANTE!
   - Dockerfile: `Dockerfile` (ele já vai encontrar automaticamente)
4. **Variáveis de ambiente** — adicione estas 3:

   | Variável       | Valor                                                                        |
   |----------------|------------------------------------------------------------------------------|
   | DATABASE_URL   | postgresql://serlivre:MarianaWogel@@postgres.ser-livre.svc.cluster.local:5432/serlivre |
   | JWT_SECRET     | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855             |
   | PORT           | 3001                                                                         |

   ⚠️  No DATABASE_URL: use a string de conexão que o EasyPanel mostrou na etapa 3.
   ⚠️  O JWT_SECRET é o mesmo que vocês geraram com openssl.

5. **Porta: 3001**
6. Clique **"Implantar"**
7. Aguarde o build (1-2 minutos)
8. Verifique nos logs se aparece: "🟢 Ser Livre API rodando na porta 3001"


## ETAPA 5: Criar o serviço Frontend

Dentro do projeto `ser-livre`:

1. Clique **"+ Serviço" → "App"**
2. Nome: `frontend`
3. **Fonte: GitHub**
   - Mesmo repositório `ser-livre`
   - Branch: `main`
   - **Diretório raiz: `/frontend`** ← IMPORTANTE!
   - Dockerfile: `Dockerfile`
4. **Variáveis de ambiente (build args)**:

   | Variável       | Valor   |
   |----------------|---------|
   | VITE_API_URL   | /api    |

5. **Porta: 80**
6. Clique **"Implantar"**


## ETAPA 6: Configurar o domínio

No serviço `frontend`:

1. Vá em **"Domínios"**
2. O EasyPanel vai gerar um domínio automático tipo:
   `https://frontend.ser-livre.xy1pmp.easypanel.host`
3. Se quiser domínio próprio, clique "Adicionar Domínio":
   - Ex: `serlivre.institutowogel.com`
   - Aponte o DNS (CNAME ou A) para o IP do servidor: 5.189.172.36
   - O EasyPanel gera o SSL automaticamente


## ETAPA 7: Ajustar o Nginx para encontrar o backend

O nginx.conf do frontend usa `proxy_pass http://backend:3001`.
No EasyPanel, o nome do serviço backend pode ser diferente.

**OPÇÃO A:** Se o EasyPanel usa o nome do serviço diretamente:
O nginx.conf já está correto (backend:3001).

**OPÇÃO B:** Se precisar ajustar, verifique no EasyPanel qual é o
hostname interno do backend. Pode ser algo como:
- `ser-livre_backend`
- `backend.ser-livre.svc.cluster.local`

Se for diferente de `backend`, edite o arquivo `frontend/nginx.conf`
no GitHub e troque `backend:3001` pelo hostname correto.


## ETAPA 8: Testar!

1. Acesse a URL do frontend no navegador
2. Deve aparecer a tela de login
3. Clique em **"Criar dados iniciais (seed)"**
4. Depois faça login:
   - Email: `mariana@institutowogel.com`
   - Senha: `123456`
5. Pronto! O sistema está no ar.


## ATUALIZAÇÃO FUTURA

Quando a Mariana pedir ajustes:
1. Eu gero os arquivos atualizados
2. Vocês fazem push no GitHub
3. No EasyPanel, cliquem "Reimplantar" no serviço alterado
4. Pronto — atualiza automaticamente sem perder dados


## TROUBLESHOOTING

### Backend não conecta no banco
Verifique nos logs do backend se o DATABASE_URL está correto.
O erro mais comum é o hostname do PostgreSQL estar errado.
No EasyPanel, vá no serviço postgres e copie a string de conexão interna.

### Frontend mostra tela branca
Verifique nos logs do frontend se o build passou.
O erro mais comum é o nginx não encontrar o backend.
Verifique se o hostname no nginx.conf bate com o nome do serviço.

### Erro de CORS
Se der erro de CORS, significa que o proxy do nginx não está funcionando.
Verifique se a porta do backend está certa nas variáveis.

### Seed não funciona / "Banco já tem dados"
O seed só roda 1 vez. Se precisar resetar, delete o banco no EasyPanel
e recrie. Os dados de demo serão recriados.
