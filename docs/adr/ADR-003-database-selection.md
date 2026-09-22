# ADR-003: Database Selection

## Status

Accepted for Version 1

## Decision

Use PostgreSQL as the marketplace's primary relational database and Prisma as the TypeScript ORM and migration tool.

## Context

The marketplace requires transactional consistency across checkout, payments, inventory reservations, refunds, settlements, audit records, and historical financial snapshots. It also requires relational ownership, unique constraints, foreign keys, indexed reporting queries, and safe migrations.

## Rationale

- PostgreSQL provides strong transactions, constraints, indexing, and mature operational tooling.
- Prisma provides typed database access, schema review, and repeatable migrations for the TypeScript backend.
- The relational model matches the documented entities and module boundaries.

## Consequences

- Local development requires a PostgreSQL database, preferably through Docker.
- Production requires encrypted backups, daily full backups, frequent incremental/transactional backups, restoration testing, RPO of one hour, and RTO of four hours.
- Schema changes must use reviewed Prisma migrations and preserve historical financial records.
- Search is database-backed in Version 1; a separate search service is future scope.
