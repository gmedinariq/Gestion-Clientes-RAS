# --- Etapa 1: compilar TypeScript ---
FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
# El esquema va antes de "npm ci" porque el postinstall ejecuta "prisma generate"
COPY prisma ./prisma
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# --- Etapa 2: imagen final, solo con lo necesario para ejecutar ---
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY prisma ./prisma
COPY data ./data
USER node
EXPOSE 3000
# Al arrancar: aplica migraciones -> usuario demo + importación inicial (si hace falta) -> API
CMD ["npm", "run", "start:docker"]
