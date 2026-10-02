# Frontend tooling stays in the build stage.
FROM node:24.21.0-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS frontend-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY client/index.html client/vite.config.js client/jsconfig.json ./
COPY client/src ./src
COPY client/public ./public
RUN npm run build

# Install Linux production dependencies independently of host node_modules.
FROM node:24.21.0-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS backend-dependencies
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:24.21.0-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS runtime
ENV NODE_ENV=production
ENV PORT=8080
WORKDIR /app/server
COPY --from=backend-dependencies /app/server/node_modules ./node_modules
COPY server/package.json server/package-lock.json server/app.js server/index.js ./
COPY server/config ./config
COPY server/controllers ./controllers
COPY server/middleware ./middleware
COPY server/routes ./routes
COPY server/services ./services
COPY server/utils ./utils
COPY --from=frontend-build /app/client/dist /app/client/dist
USER node
EXPOSE 8080
CMD ["node", "index.js"]
