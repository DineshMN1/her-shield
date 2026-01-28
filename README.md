# Health SOS - Starter Monorepo

## Overview
This repo is a starter monorepo implementing:
- Next.js PWA frontend (apps/web)
- NestJS backend API (services/api) with Prisma & Postgres
- Redis + BullMQ notification worker (services/ai-worker)
- Docker Compose for local dev

It includes SOS flows, appointment & video session metadata, hospital mapping, and background workers.

## Quickstart (local)
1. Install pnpm & Docker
2. Copy `.env.example` -> `.env` and fill (for dev, not all provider keys required)
3. From repo root run:
   docker compose -f infra/docker-compose.yml up --build
4. Init Prisma (in services/api):
   cd services/api
   pnpm install
   pnpm prisma generate
   pnpm prisma migrate dev --name init
5. Start frontend:
   pnpm --filter ./apps/web dev
6. Start worker (if not using Docker):
   pnpm --filter ./services/ai-worker dev

Frontend: http://localhost:3000
API: http://localhost:4000

## Notes
- This is a dev starter. For production: enable TLS, configure proper secrets, obtain BAAs for providers handling PHI, add monitoring and rate limiting.
- Video tokens are stubbed — integrate Agora/Twilio SDKs in video.service.ts and frontend.
