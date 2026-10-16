# Image de production de Magnitude (serveur temps réel + client compilé).
# Construction :  docker build -t magnitude .
# Lancement   :  docker run -p 8080:8080 -v magnitude-data:/data magnitude
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0 \
    STATIC_DIR=/app/dist/public \
    DATA_DIR=/data
# Le serveur est un fichier unique (ws inclus) : aucune dépendance à installer.
COPY --from=build /app/dist ./dist
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
CMD ["node", "dist/server.js"]
