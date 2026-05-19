##
# Production API image
#
# Single-package install; configuration via .env at runtime.
##

FROM node:22-bookworm AS deps

RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential python3 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-bookworm-slim AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4001

COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=deps /usr/src/app/package.json ./package.json

COPY bin ./bin
COPY lib ./lib
COPY libs ./libs
COPY models ./models
COPY common ./common

EXPOSE 4001

CMD ["node", "--max-old-space-size=6144", "bin/server.js"]
