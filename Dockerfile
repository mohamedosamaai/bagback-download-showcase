# ═══════════════════════════════════════════════════
# Stage 1: Build React Frontend
# ═══════════════════════════════════════════════════
FROM node:20-alpine AS frontend-builder

WORKDIR /build

# Copy web app
COPY apps/web/package.json ./apps/web/
RUN cd apps/web && npm install

COPY apps/web/ ./apps/web/

# Build
RUN cd apps/web && npm run build

# ═══════════════════════════════════════════════════
# Stage 2: Build Node.js Backend
# ═══════════════════════════════════════════════════
FROM node:20-alpine AS backend-builder

WORKDIR /build

COPY apps/server/package.json ./
RUN npm install

COPY apps/server/ ./
RUN npm run build

# ═══════════════════════════════════════════════════
# Stage 3: Production Image
# ═══════════════════════════════════════════════════
FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ffmpeg \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp (latest stable)
RUN pip install --no-cache-dir yt-dlp

# Verify installations
RUN yt-dlp --version && ffmpeg -version | head -1

# Create app user
RUN useradd -m -u 1001 bagback

WORKDIR /app

# Copy built backend
COPY --from=backend-builder /build/dist ./dist
COPY --from=backend-builder /build/node_modules ./node_modules

# Copy built frontend as static files the server will serve
COPY --from=frontend-builder /build/apps/web/dist ./static

# Create downloads directory
RUN mkdir -p /downloads && chown bagback:bagback /downloads
RUN chown -R bagback:bagback /app

USER bagback

ENV NODE_ENV=production
ENV PORT=4000
ENV DOWNLOAD_DIR=/downloads
ENV STATIC_DIR=/app/static

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:4000/api/health || exit 1

CMD ["node", "dist/index.js"]

