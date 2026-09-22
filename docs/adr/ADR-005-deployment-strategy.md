# ADR-005: Deployment Strategy

## Status

Accepted for Version 1

## Decision

Deploy the modular monolith on AWS. Use a Node.js TypeScript backend built with NestJS and the Fastify adapter, PostgreSQL with Prisma, private Amazon S3 for seller verification documents, Amazon SES for transactional email, and a background worker for retries and non-immediate work.

The frontend will be a separate Next.js/React application that communicates with the NestJS API.

## Context

Version 1 requires a web marketplace, Razorpay payments, private document storage, email notifications, background jobs, manual shipping, manual seller payouts, 99.9% monthly uptime, RPO of one hour, and RTO of four hours.

## Rationale

- NestJS provides explicit module boundaries and dependency management for the modular monolith.
- Fastify provides the HTTP adapter without changing NestJS application structure.
- AWS matches the approved hosting, storage, and email decisions.
- Separate frontend and backend deployments keep API business logic independent from the user interface.

## Consequences

- Deployment configuration must manage database, Razorpay, S3, SES, and worker secrets outside source control.
- Background jobs must be retryable and must not roll back completed business transactions.
- Automated shipping and automated seller payouts remain outside Version 1.
- Infrastructure, monitoring, backups, restoration tests, and incident procedures are required before production launch.
