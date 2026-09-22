# Return and Refund Management API

## Document Information

| Field | Value |
|---|---|
| Document Name | Return and Refund Management API |
| Product | Multi-Vendor Marketplace |
| API Version | v1 |
| Status | Draft |
| Parent Document | API Design |
| Related Documents | Order Management API, Payment Management API, Settlement Management API |

## 1. Overview

This module owns return requests, administrative review, refund creation, provider processing, and refund history. Return and refund decisions must preserve original order and payment snapshots.

## 2. Endpoints

| Method | Endpoint | Actor | Purpose |
|---|---|---|---|
| POST | `/api/v1/orders/:orderId/items/:orderItemId/returns` | Customer | Request a return |
| GET | `/api/v1/returns` | Customer | List own return requests |
| GET | `/api/v1/returns/:returnRequestId` | Customer/Admin | View a return request |
| GET | `/api/v1/sellers/me/returns` | Seller | View returns for own products |
| GET | `/api/v1/admin/returns` | Super Admin | Review return requests |
| POST | `/api/v1/admin/returns/:returnRequestId/approve` | Super Admin | Approve a return |
| POST | `/api/v1/admin/returns/:returnRequestId/reject` | Super Admin | Reject a return |
| POST | `/api/v1/admin/returns/:returnRequestId/complete` | Super Admin | Confirm returned item |
| GET | `/api/v1/admin/refunds` | Super Admin | Review refunds |
| POST | `/api/v1/admin/refunds/:refundId/process` | Super Admin | Process a refund |
| GET | `/api/v1/refunds` | Customer | List own refunds |
| GET | `/api/v1/refunds/:refundId` | Customer/Admin | View a refund |

## 3. Return Request

A return request must identify the customer's Order Item, quantity, reason, and any required comments. The customer may request returns only for their own eligible items, within the configured return window and policy.

Return quantity cannot exceed the eligible quantity. A completed, cancelled, or fully returned item cannot accept another return request.

## 4. Approval and Completion

Super Admin approval is required where the marketplace policy requires it. Approval does not itself complete the return or refund. The returned product must be received and verified before a return-linked refund is processed. Accepted returns may update Inventory through Inventory Management.

## 5. Refund Rules

- A refund must reference a successful original Payment Transaction.
- Refund amount must not exceed the remaining refundable amount.
- Refund reason and currency are required.
- Provider confirmation is required before status becomes Succeeded.
- Full and partial refunds are supported. For an eligible cancellation or return, refund the actual discounted amount paid for the affected item and refund applicable tax proportionally. Do not refund the discount separately. Shipping charges are partially refunded according to the configured policy, and the corresponding seller commission is reversed or adjusted.
- The normal return window is five days after delivery. Cancellation and post-delivery return refunds follow separate rules and timing.
- All products are returnable/refundable in Version 1. Super Admin approval and physical return verification are required for post-delivery returns. Inventory is restocked only after inspection and acceptance.
- Duplicate requests and retries must not produce duplicate financial refunds.
- Refunds must update order/payment state and be reflected in settlement calculations.

## 6. Errors

`RETURN_NOT_FOUND`, `RETURN_NOT_ELIGIBLE`, `RETURN_QUANTITY_INVALID`, `RETURN_STATE_INVALID`, `REFUND_NOT_FOUND`, `REFUND_NOT_ALLOWED`, `REFUND_AMOUNT_EXCEEDED`, `PAYMENT_NOT_REFUNDABLE`, `REFUND_ALREADY_PROCESSED`, and `VALIDATION_ERROR`.

## 7. Idempotency and Audit

Approval, rejection, completion, and refund processing must be idempotent. Return approvals, rejections, refund decisions, and provider results must create audit records.

## 8. Related Entities

Order, Order Item, Customer Profile, Return Request, Refund, Payment Transaction, Inventory, Settlement Item, Notification, Audit Log, Activity Log.
