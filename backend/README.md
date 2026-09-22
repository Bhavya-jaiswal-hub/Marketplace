# Marketplace Backend

NestJS backend for the multi-vendor marketplace.

## Stack

- Node.js and TypeScript
- NestJS with Fastify
- PostgreSQL with Prisma
- Jest

## Local setup

1. Copy `.env.example` to `.env`.
2. Start PostgreSQL with `docker compose up -d postgres`.
3. Install dependencies with `npm install`.
4. Generate Prisma Client with `npm run prisma:generate`.
5. Run tests with `npm test`.
6. Start the API with `npm run start:dev`.

Health endpoint: `GET http://localhost:3000/api/v1/health`
