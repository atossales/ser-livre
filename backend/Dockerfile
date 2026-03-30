FROM node:20-slim

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev

RUN npx prisma generate

COPY src ./src

EXPOSE 3001

CMD ["sh", "-c", "timeout 60 npx prisma db push --accept-data-loss --skip-generate 2>&1 && echo '[STARTUP] Schema OK'; node src/server.js"]
