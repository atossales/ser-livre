FROM node:20-slim

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev

RUN npx prisma generate

COPY src ./src

EXPOSE 3001

# Roda prisma db push (cria tabelas faltantes) ANTES de iniciar o servidor.
# Usa o binário local para garantir que funciona no container sem depender do PATH do sistema.
# O "|| true" garante que o servidor inicia mesmo se o push falhar por alguma razão.
CMD ["sh", "-c", "node_modules/.bin/prisma db push --accept-data-loss --skip-generate 2>&1 || true; node src/server.js"]
