# ========================================
# Backend Node.js + TypeScript
# ========================================
FROM node:18-alpine

# Instalar dependências do sistema
RUN apk add --no-cache curl

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Diretório de trabalho
WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production && \
    npm install -g tsx

# Copiar código fonte
COPY --chown=nodejs:nodejs . .

# Mudar para usuário não-root
USER nodejs

# Expor porta
EXPOSE 3001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s \
  CMD curl -f http://localhost:3001/health || exit 1

# Comando: executar com tsx (TypeScript direto)
CMD ["npx", "tsx", "src/server.ts"]
