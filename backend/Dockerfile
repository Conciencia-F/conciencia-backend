# --- Builder ---
# Esta etapa instala TODO y compila el código. La dejaremos con todas
FROM node:20-alpine AS builder

RUN npm install -g pnpm
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm prisma generate
RUN pnpm build

# --- Fase 2: El Paquete Final para Producción (Runner) ---
# Esta etapa es para producción. Será súper ligera.
FROM node:20-alpine AS runner

RUN npm install -g pnpm
WORKDIR /app

# Creamos el usuario no-root para producción.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Aquí está la nueva lógica: copiamos la lista de dependencias
# e instalamos SOLAMENTE las de producción.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Ahora, copiamos el código ya compilado desde la etapa 'builder'.
COPY --from=builder /app/dist ./dist
# También copiamos el cliente de Prisma generado.
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

RUN chown -R appuser:appgroup .
USER appuser

EXPOSE 3000

CMD ["node", "dist/main.js"]
