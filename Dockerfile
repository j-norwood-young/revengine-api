##
# Production API image
#
# Build from parent directory so local jxp (file:../jxp) is available until jxp@4 is on npm:
#   docker build -f revengine-api/Dockerfile -t revengine-api ..
##

FROM node:22-bookworm AS deps

RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential python3 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY revengine-api/package.json revengine-api/package-lock.json ./
COPY jxp /usr/src/jxp

RUN sed -i 's|"file:../jxp"|"file:/usr/src/jxp"|' package.json \
  && npm ci --legacy-peer-deps

FROM node:22-bookworm AS builder

WORKDIR /usr/src/app

COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=deps /usr/src/app/package.json ./package.json
COPY revengine-api/package-lock.json revengine-api/tsconfig.json revengine-api/tsconfig.build.json ./
COPY revengine-api/src ./src

RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4001

COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package.json ./package.json
COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 4001

CMD ["node", "--max-old-space-size=6144", "dist/bin/server.js"]
