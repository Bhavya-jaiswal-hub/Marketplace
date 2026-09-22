# Current Issues

**Project:** Multi-Vendor Marketplace
**Last Updated:** 2026-08-24

This file records active blockers, risks, inconsistencies, and follow-up actions. Resolved items should be moved to the resolution history instead of silently removed.

## Active Issues

| ID | Severity | Area | Issue | Impact | Next Action | Status |
|---|---|---|---|---|---|---|
| ISSUE-001 | High | Database | Phase 1 identity models now exist in the Prisma schema, but no database migration has been applied yet. | Feature implementation cannot persist business data until PostgreSQL is running and the migration is applied. | Start PostgreSQL and run the first Prisma migration. | Open |
| ISSUE-002 | Medium | Test environment | Jest authentication tests are present and have no editor errors, but the runner does not return a completion result in the current terminal session. | Automated test completion is not fully verified yet. | Run `npm test -- --runInBand --verbose` from a normal terminal and inspect the Jest/Node versions if it still hangs. | Open |
| ISSUE-003 | Medium | Documentation | The main roadmap still labels the documentation-baseline subsection as in progress even though the active documentation synchronization is complete. | Project status can be read inconsistently. | Update the Phase 0 documentation-baseline status to complete. | Open |
| ISSUE-004 | Medium | Requirements | Seller onboarding decision references “Option A,” but the exact Option A wording is not included in the completed clarification document. | Seller address approval timing may need a precise implementation rule. | Obtain or define the exact Option A wording before finalizing seller onboarding behavior. | Open |
| ISSUE-005 | Low | Configuration | Password strength, image limits, product-specification validation, low-stock thresholds, tax, and shipping-refund configuration values are not yet concrete. | Some validation and calculation details cannot be finalized. | Define configuration defaults before implementing the affected modules. | Open |
| ISSUE-006 | Low | Infrastructure | AWS deployment details such as the exact compute service, worker service, queue choice, monitoring, and secret manager are not selected. | Production deployment cannot yet be automated. | Decide infrastructure during Phase 8; local development can proceed with Docker PostgreSQL. | Deferred |
| ISSUE-007 | Low | Compliance | Legal, tax, privacy, KYC, consumer-protection, and payment requirements require professional validation before production. | Production launch must not proceed without compliance review. | Create and complete a professional compliance checklist before release. | Deferred |
| ISSUE-008 | Medium | Authentication | Email delivery and login/password-reset rate limiting are not yet connected; session endpoints are implemented but not fully integration-tested. | Phase 1 is not complete and email verification cannot be used end to end yet. | Add the email provider abstraction, rate-limit guard, and focused integration tests. | Open |

## Risks Being Monitored

- Payment webhook failure or delayed delivery could leave successful payments without finalized orders; reconciliation is required in Phase 5.
- Concurrent inventory reservations could oversell stock if database locking and idempotency are not implemented together.
- Historical prices, commission, tax, shipping, refund, and address values must be snapshotted so later configuration changes do not rewrite history.
- Verification documents require private storage, strict object-level authorization, encryption, retention controls, and download auditing.
- Account deactivation must preserve required order, payment, settlement, and audit records.

## Resolved Issues

None recorded yet.

## Issue Management Rules

- New issues must include impact and a next action.
- High-severity issues block the dependent phase until resolved or explicitly accepted.
- Do not close an issue based only on documentation; verify the implementation or test result where applicable.
- Record the resolution and validation evidence before moving an issue to Resolved.
