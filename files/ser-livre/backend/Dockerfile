# ============================================================
# DOCKERFILE DO BACKEND
# Cria a "caixa" onde o backend vai rodar.
# Usa Node.js 20 (versão LTS estável).
# ============================================================

FROM node:20-alpine

WORKDIR /app

# 1. Copia arquivos de dependências primeiro (para cache)
COPY package*.json ./
COPY prisma ./prisma/

# 2. Instala dependências
RUN npm ci --only=production

# 3. Gera o cliente Prisma (conecta com o banco)
RUN npx prisma generate

# 4. Copia o código fonte
COPY src ./src

# 5. Expõe a porta 3001
EXPOSE 3001

# 6. Ao iniciar: roda as migrations e depois inicia o servidor
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
