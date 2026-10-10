# Una sola imagen para API y worker: mismo código, distinto comando (como dos servicios ECS con la misma imagen).

# ---- build: compila TypeScript y genera Prisma Client ----
FROM node:22-alpine AS build
WORKDIR /app
# Misma versión de npm que generó el package-lock.json; npm 10 interpreta distinto las dependencias opcionales.
RUN npm install -g npm@11.6.2
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npx prisma generate && npm run build
# Quita devDependencies (tsx, vitest, eslint...) para que la imagen final pese menos.
RUN npm prune --omit=dev

# ---- runtime ----
FROM node:22-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/document-processing/infrastructure/persistence/models ./src/document-processing/infrastructure/persistence/models
# Usuario sin privilegios: si alguien explota la app, no es root dentro del contenedor.
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads
USER node
EXPOSE 3001
# API por defecto: aplica migraciones pendientes y arranca. El worker sobrescribe el comando.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main/index.js"]
