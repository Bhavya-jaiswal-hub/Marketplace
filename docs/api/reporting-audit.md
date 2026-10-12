# Reporting and Audit API

## Document Information

| Field | Value |
|---|---|
| Document Name | Reporting and Audit API |
| Product | Multi-Vendor Marketplace |
| API Version | v1 |
| Status | Draft |
| Parent Document | API Design |

## 1. Overview

Reporting and Audit provides authorized operational reports and immutable records for critical marketplace actions. It must use business-owned data through defined interfaces and must not expose unrestricted database queries.

## 2. Report Endpoints

| Method | Endpoint | Actor | Purpose |
|---|---|---|---|
| GET | `/api/v1/admin/reports/sales` | Super Admin | Marketplace GMV & sales report |
| GET | `/api/v1/admin/reports/admin-sales` | Super Admin | Admin direct retail sales report (segregated from marketplace) |
| GET | `/api/v1/admin/reports/revenue` | Super Admin | Platform net revenue report |
| GET | `/api/v1/admin/reports/commission` | Super Admin | Category commission earnings report |
| GET | `/api/v1/admin/reports/settlements` | Super Admin | Settlement & adjustment debit ledger report |
| GET | `/api/v1/admin/reports/sellers` | Super Admin | Seller performance report |
| GET | `/api/v1/admin/reports/products` | Super Admin | Product catalog report |
| GET | `/api/v1/admin/reports/inventory` | Super Admin | Variant inventory & low-stock report |
| GET | `/api/v1/admin/reports/verifications` | Super Admin | Pending verification & moderation audit report |
| GET | `/api/v1/admin/audit-logs` | Super Admin | Search immutable audit log records |
| GET | `/api/v1/admin/activity-logs` | Super Admin | Search activity records |
| GET | `/api/v1/reports/:reportId` | Authorized actor | View generated report metadata & download link |

## 3. Rules

- **Admin Sales Segregation (SRS FR-14, BR-7):** Products sold directly by the Super Admin operate with 0% platform commission and are excluded from seller settlements. Admin retail revenue, order volumes, and fulfillment stats are tracked and reported separately via `/api/v1/admin/reports/admin-sales`.
- Administrative reports require Super Admin authorization unless a future seller-scoped report is explicitly approved.
- Every report must support bounded pagination or controlled export limits.
- Date ranges, filters, and sort fields must be validated and allowlisted.
- Financial reports must use historical order, payment, refund, commission, and settlement values rather than recalculating with current configuration.
- Sensitive seller verification, payment, and personal data must be minimized or restricted.
- Report generation may be synchronous for small results and asynchronous for large exports.
- Report metadata records generation status, filters, creator, timestamps, and storage reference.
- Version 1 reports are downloadable as CSV and PDF.
- Audit and financial records are retained for seven years, subject to applicable legal requirements.
- Seller analytics are limited to the seller's authorized scope; verification and payment data remain Super Admin-only.

## 4. Audit Records

Audit records must be created for seller verification decisions, category decisions, commission changes, order state changes, refunds, settlements, permission changes, and other critical administrative operations. Audit records are append-only and must not contain credentials or secrets.

Activity Log may record general user/system activity but must also avoid sensitive credentials.

## 5. Export and Audit Access

Report requests validate date ranges, filters, format, and export size. Small reports may be synchronous; large reports are queued and expose Report Metadata until ready. Generated files use private storage and authorized downloads. Audit searches are append-only, paginated, and filterable by actor, action, entity, and date range.

## 6. Idempotency, Audit, and Security

Repeated report requests with the same request reference must not create uncontrolled duplicate jobs. Reports and audit endpoints enforce role and scope authorization. Exports redact secrets, private verification documents, credentials, and unnecessary personal data. Document downloads are audited.

## 7. Test Scenarios

- Super Admin can generate each required report in CSV and PDF.
- Invalid filters, date ranges, formats, and oversized exports are rejected.
- Seller analytics cannot expose another seller's data.
- Financial reports use historical prices, commissions, refunds, and settlements.
- Required administrative actions create append-only audit records.
- Verification-document downloads are restricted and audited.

## 8. Errors

`REPORT_NOT_FOUND`, `REPORT_ACCESS_DENIED`, `INVALID_REPORT_FILTER`, `REPORT_TOO_LARGE`, `AUDIT_LOG_ACCESS_DENIED`, and `VALIDATION_ERROR`.

## 9. Related Entities

Order, Order Item, Product, Inventory, Seller Profile, Category, Payment Transaction, Refund, Settlement, Audit Log, Activity Log, Report Metadata.
