# syntax=docker/dockerfile:1.7

# Build stage: install pnpm, install workspace deps, build the Astro site.
FROM node:22-alpine AS builder

# pnpm 9 to match the rest of the Tickbox CI; pnpm 11 has a stricter
# postinstall gate that needs an explicit allowlist we don't want to drag
# into the docs image.
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /workspace

# Copy workspace manifest + lockfile + every package's package.json so pnpm
# can resolve the graph deterministically. Source comes after.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY docs/package.json ./docs/
COPY packages/banner-default/package.json ./packages/banner-default/
COPY packages/cli/package.json ./packages/cli/
COPY packages/cloud/package.json ./packages/cloud/
COPY packages/core/package.json ./packages/core/
COPY packages/nuxt/package.json ./packages/nuxt/
COPY packages/react/package.json ./packages/react/
COPY packages/vue/package.json ./packages/vue/

# Install the full workspace — docs needs SDK package source on disk for
# starlight-typedoc to walk imports across packages (e.g.
# banner-default → @tickboxhq/react), and pnpm needs the workspace links
# to be present for that to resolve. The image is throwaway, so the extra
# install cost only matters during build.
RUN pnpm install --frozen-lockfile

# Docs build needs the SDK package sources: starlight-typedoc walks each
# package's tsconfig + entry point, and docs/scripts/gen-vendors.mjs reads
# packages/core/src/jurisdictions/vendors.ts. Bulk-copy the packages
# directory (.dockerignore excludes node_modules and dist) to pick up
# every package's src/, tsconfig.json, and tsup.config.ts in one shot.
COPY tsconfig.base.json ./
COPY packages/ ./packages/

# Build the SDK packages first so their dist/*.d.ts files exist —
# TypeDoc walks imports like `from '@tickboxhq/core'` via each package's
# `types` field, which points into dist/. No dist, no types, broken
# resolution.
RUN pnpm -r --filter='./packages/*' build

# Now copy the docs source and build.
COPY docs/ ./docs/
WORKDIR /workspace/docs
RUN pnpm build

# Runtime stage: nginx-alpine serving the static output. Final image ~20 MB.
FROM nginx:1.27-alpine AS runtime

# Replace the default nginx config with ours (no upstream, gzip, cache headers,
# /healthz).
COPY docs/nginx.conf /etc/nginx/nginx.conf

# Copy the built site.
COPY --from=builder /workspace/docs/dist /usr/share/nginx/html

# Run as the unprivileged nginx user that ships with the upstream image. The
# config listens on 8080 so this works without CAP_NET_BIND_SERVICE.
RUN chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx \
 && touch /tmp/nginx.pid \
 && chown nginx:nginx /tmp/nginx.pid

USER nginx

EXPOSE 8080

# stop-on-quit so Kubernetes graceful shutdown works (default is SIGQUIT for
# fast shutdown; SIGTERM for graceful, which is what k8s sends).
STOPSIGNAL SIGQUIT

CMD ["nginx", "-g", "daemon off;"]
