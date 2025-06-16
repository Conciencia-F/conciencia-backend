FROM node:20-alpine

WORKDIR /app

COPY . .

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install

# Se construye la app
RUN pnpm build

# Exponer puerto y comando de ejecución
EXPOSE 3000
CMD ["pnpm", "start:prod"]
