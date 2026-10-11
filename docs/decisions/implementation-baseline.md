# Implementation Baseline

## Purpose

This document records the working decisions used while completing the remaining API and feature specifications. It keeps the documentation aligned with the SRS and the concrete entity definitions.

## Decisions

| Area | Version 1 decision | Reason |
|---|---|---|
| Architecture | Modular monolith with layered business modules | Matches the approved architecture document. |
| Product categories | A product uses one category in Version 1 | Multi-category products are deferred to a future model change. |
| Product variants | Product variants are excluded from Version 1 | Each product has its own SKU, price, and inventory; variants require a future approved entity and API contract. |
| Seller category ownership | Category Management owns category requests, approvals, assignments, revocation, and commission configuration | Prevents duplicate administrative ownership between Seller Management and Category Management. Seller APIs expose seller-scoped views only. |
| Seller documents | Use the entity term `Verification Document` | This is the approved entity name; Seller Management API terminology should be synchronized to it. |
| Customer addresses | An active customer `Address` entity is required | `Address-Pending` alone cannot support checkout, shipping-address references, or address management. |
| Payments | Use separate pending-payment-attempt and finalized-payment-transaction records | A payment is authoritative only after validated gateway confirmation. |
| Multi-seller orders | Store one customer-facing Order and seller-specific Order Items; seller processing is grouped by Seller ID | This satisfies unified checkout while avoiding an additional sub-order entity in Version 1. |
| Historical financial values | Snapshot price, commission rate, commission amount, and relevant totals on Order Item/financial records | Current product and commission configuration must never rewrite history. |
| Settlement initiation | Super Admin manually initiates weekly settlement processing | Matches the SRS and settlement entity. |
| Settlement holding period | Seven days after delivery | An Order Item is eligible only after the holding period is complete and no blocking return/refund exists. |
| Deletion | Use soft deletion or status transitions for historical business entities | Preserves orders, refunds, settlements, reports, and audit history. |
| Notifications | Notification delivery failure does not roll back the primary transaction | Matches the API and architecture rules; failures are recorded for retry/monitoring. |

## Remaining Implementation Clarifications

1. Record the exact Seller onboarding Option A wording referenced by the client decision.
2. Define the concrete password, image, specification, low-stock, tax, and shipping configuration values using the approved defaults.
3. Complete professional validation of applicable Indian legal, tax, privacy, KYC, consumer-protection, and payment requirements before production.

## Documentation Synchronization Rules

- Category administration is documented under Category Management.
- Seller Management documents seller-owned profile, address, document, status, and seller-scoped category views.
- API terminology must match entity terminology.
- New entities required by the SRS must be documented before their APIs are finalized.
- Every financial operation must define authorization, validation, idempotency, audit effects, and historical-data behavior.
