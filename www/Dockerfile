# syntax=docker/dockerfile:1.7

# Build stage: install pnpm + workspace deps, build the marketing site.
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /workspace

# Copy workspace manifest + lockfile + every package's package.json so pnpm
# can resolve the graph deterministically before source comes in.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY www/package.json ./www/
COPY packages/banner-default/package.json ./packages/banner-default/
COPY packages/cli/package.json ./packages/cli/
COPY packages/cloud/package.json ./packages/cloud/
COPY packages/core/package.json ./packages/core/
COPY packages/nuxt/package.json ./packages/nuxt/
COPY packages/react/package.json ./packages/react/
COPY packages/vue/package.json ./packages/vue/

# Install the full workspace — www imports @tickboxhq/core +
# @tickboxhq/banner-default for the builder page's live preview.
RUN pnpm install --frozen-lockfile

# SDK package sources for workspace links. Same shape as docs/Dockerfile.
COPY tsconfig.base.json ./
COPY packages/ ./packages/

# Build the SDK packages first so @tickboxhq/banner-default + @tickboxhq/core
# have a dist/ for the marketing site to consume.
RUN pnpm -r --filter='./packages/*' build

COPY www/ ./www/
WORKDIR /workspace/www
RUN pnpm build

# Runtime stage: nginx-alpine serving the static output.
FROM nginx:1.27-alpine AS runtime

COPY www/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /workspace/www/dist /usr/share/nginx/html

RUN chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx \
 && touch /tmp/nginx.pid \
 && chown nginx:nginx /tmp/nginx.pid

USER nginx
EXPOSE 8080
STOPSIGNAL SIGQUIT
CMD ["nginx", "-g", "daemon off;"]
