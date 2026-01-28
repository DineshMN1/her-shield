FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl postgresql-client
WORKDIR /app

# ============================================
# Install Web Dependencies
# ============================================
FROM base AS web-deps
COPY apps/web/package*.json ./
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# ============================================
# Install API Dependencies
# ============================================
FROM base AS api-deps
COPY services/api/package*.json ./
COPY services/api/prisma ./prisma
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# ============================================
# Build Web
# ============================================
FROM base AS web-builder

ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_WS_URL=ws://localhost:4000
ARG NEXT_PUBLIC_ONESIGNAL_APP_ID

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL \
    NEXT_PUBLIC_ONESIGNAL_APP_ID=$NEXT_PUBLIC_ONESIGNAL_APP_ID \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

COPY --from=web-deps /app/node_modules ./node_modules
COPY apps/web ./
RUN npm run build

# ============================================
# Build API
# ============================================
FROM base AS api-builder

COPY --from=api-deps /app/node_modules ./node_modules
COPY --from=api-deps /app/prisma ./prisma
COPY services/api ./

RUN npx prisma generate && npm run build

# ============================================
# Production Runtime
# ============================================
FROM base AS runner

ENV NODE_ENV=production \
    PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 healthsos

# Copy API
COPY --from=api-builder --chown=healthsos:nodejs /app/dist /app/api/dist
COPY --from=api-builder --chown=healthsos:nodejs /app/node_modules /app/api/node_modules
COPY --from=api-builder --chown=healthsos:nodejs /app/package.json /app/api/
COPY --from=api-builder --chown=healthsos:nodejs /app/prisma /app/api/prisma

# Copy Web  
COPY --from=web-builder --chown=healthsos:nodejs /app/.next/standalone /app/web
COPY --from=web-builder --chown=healthsos:nodejs /app/.next/static /app/web/.next/static
COPY --from=web-builder --chown=healthsos:nodejs /app/public /app/web/public

# Create startup script inline
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'set -e' >> /app/start.sh && \
    echo 'echo "🔄 Running migrations..."' >> /app/start.sh && \
    echo 'cd /app/api && npx prisma migrate deploy || echo "No migrations"' >> /app/start.sh && \
    echo 'echo "🚀 Starting API on :4000..."' >> /app/start.sh && \
    echo 'cd /app/api && node dist/main.js &' >> /app/start.sh && \
    echo 'API_PID=$!' >> /app/start.sh && \
    echo 'echo "🌐 Starting Web on :3000..."' >> /app/start.sh && \
    echo 'cd /app/web && node server.js &' >> /app/start.sh && \
    echo 'WEB_PID=$!' >> /app/start.sh && \
    echo 'wait $API_PID $WEB_PID' >> /app/start.sh && \
    chmod +x /app/start.sh && \
    chown healthsos:nodejs /app/start.sh

USER healthsos
WORKDIR /app

EXPOSE 3000 4000

CMD ["/app/start.sh"]
