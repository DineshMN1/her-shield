# Stage 1: Install dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copy package files and prisma schema
COPY services/api/package.json services/api/package-lock.json* ./
COPY services/api/prisma ./prisma

# Install dependencies
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# Stage 2: Build the application
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production

# Copy node_modules and prisma from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copy the entire API source
COPY services/api ./

# Generate Prisma Client
RUN npx prisma generate

# Build the NestJS application
RUN npm run build

# Stage 3: Production runtime
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl curl
WORKDIR /app

ENV NODE_ENV=production

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# Create entrypoint script
RUN printf '#!/bin/sh\n\
echo "Running database migrations..."\n\
npx prisma migrate deploy\n\
echo "Starting application..."\n\
exec node dist/main.js\n' > /entrypoint.sh && \
    chmod +x /entrypoint.sh

EXPOSE 4000

CMD ["/entrypoint.sh"]
