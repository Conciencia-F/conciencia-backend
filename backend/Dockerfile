# === Builder (con devDependencies y build) ===
FROM node:20-alpine AS builder

WORKDIR /app

# 1. Copia definir deps y las instala
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm \
 && pnpm install

# 2. Copia tu esquema y genera Prisma Client
COPY prisma ./prisma
RUN npx prisma generate

# 3. Copia todo y compila tu TS a JS
COPY . .
RUN pnpm build

# === Runner (solo prodDependencies + artefactos) ===
FROM node:20-alpine AS runner

WORKDIR /app

# 4. Instala solo deps de producción
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm \
 && pnpm install --prod

# 5. Copia Prisma Client ya generado y dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/dist ./dist

# 6. Arranque directo del bundle
CMD ["node", "dist/main.js"]
