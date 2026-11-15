# THE OPEN WORLD — PC hosted backend image (TOW PC phase 2).
#
# Shape mirrors Dispatch HQ's Render Dockerfile (node:22 image,
# install, build, migrate-then-serve CMD). Node 22 is set
# explicitly: TOW's package.json wants Node >=22.6 (the build
# toolchain uses --experimental-strip-types), and the server runs
# on Render's Node 22 — NOT on Electron's Node 20 (the Electron
# shell never runs this server; see backend/README.md "Node /
# Electron").
#
# Build context is the repo root (render.yaml sets
# dockerfilePath: ./backend/Dockerfile with the default context),
# so COPY paths below are repo-relative.
FROM node:22-bookworm-slim

WORKDIR /app

# Install first (cached layer): package.json + lockfile only, so a
# source-only change does not reinstall.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# The rest of the tree (node_modules + dist are excluded by
# .dockerignore at the repo root).
COPY . .

# Build the PC edition: client (unused by this image, but the --pc
# build produces it alongside) + pc-server + pc-backend + migrate.
# The server bundles are plain CJS — no Bun, no extra runtime.
RUN node --experimental-strip-types ./tools/build.ts --pc

ENV NODE_ENV=production
EXPOSE 3101

# Apply the DB migration (idempotent), then serve API + WS on $PORT
# (pc-backend reads PORT; Render injects it).
CMD ["sh", "-c", "node dist/pc/server/migrate.cjs && node dist/pc/server/pc-backend.cjs"]
