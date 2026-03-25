# ============================================================
# DOCKERFILE DO FRONTEND
# 
# ETAPA 1 (build): Usa Node.js para compilar o React
# ETAPA 2 (serve): Usa Nginx para servir os arquivos estáticos
# ============================================================

# Etapa 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Etapa 2: Servir com Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
