# Payment Management API

## Document Information

| Field | Value |
|---|---|
| Document Name | Payment Management API |
| Product | Multi-Vendor Marketplace |
| API Version | v1 |
| Status | Draft |
| Parent Document | API Design |
| Related Documents | Order Management API, Return & Refund Management API, Settlement Management API |

## 1. Overview

Payment Management owns payment attempts, gateway confirmation, finalized payment transactions, reconciliation, and payment status updates. The marketplace receives customer payment; sellers do not receive direct customer payments.

## 2. Endpoints

| Method | Endpoint | Actor | Purpose |
|---|---|---|---|
| POST | `/api/v1/payments` | Customer | Initiate payment for a checkout |
| GET | `/api/v1/payments/:paymentReference` | Customer | View own payment status |
| POST | `/api/v1/payments/:paymentReference/confirm` | Internal/Provider | Confirm a validated payment result |
| POST | `/api/v1/payments/webhooks/:provider` | Payment Gateway | Receive verified provider callback |
| GET | `/api/v1/orders/:orderId/payments` | Customer/Admin | View payment records according to authorization |
| POST | `/api/v1/admin/payments/:paymentReference/reconcile` | Super Admin | Reconcile an exceptional payment |

## 3. Common Rules

### Authentication and Authorization

- Payment initiation requires an authenticated Customer.
- Customers may view only their own payment attempts and transactions.
- Sellers cannot view or modify customer payment credentials or payment records outside authorized order/settlement views.
- Super Admin may view payment records and reconcile exceptional payment states.
- The payment webhook endpoint is callable by Razorpay but accepts only verified provider requests.

### Version 1 Payment Policy

- Razorpay is the only payment gateway.
- All Razorpay-supported payment methods are allowed except Cash on Delivery.
- Currency is INR with two decimal places.
- One payment flow is used for one customer checkout; partial or split payments are not supported.
- Payment credentials are never stored. Only provider references and safe payment metadata are retained.
- A payment attempt expires after 15 minutes.
- A checkout may have at most three payment attempts. After the third failed or expired attempt, the customer must start a new checkout/payment flow.

### State Model

```text
Pending -> Succeeded
Pending -> Failed
Pending -> Expired
Pending -> Cancelled
```

Only `Succeeded` is authoritative for order creation. A payment transition must be monotonic and must not overwrite a finalized successful transaction with a later failure callback.

## 4. Initiate Payment

`POST /api/v1/payments`

```json
{
  "checkoutId": "checkout-id",
  "paymentMethod": "provider-method"
}
```

### Request

```json
{
  "checkoutId": "checkout-id",
  "paymentMethod": "provider-method",
  "idempotencyKey": "client-generated-key"
}
```

### Rules

- The checkout must belong to the authenticated customer.
- The checkout must contain at least one valid item and a positive INR total.
- Product prices, stock, tax, shipping, and totals must be revalidated before payment initiation.
- Out-of-stock, unavailable, or price-changed items block initiation until checkout is refreshed.
- Inventory is reserved during the checkout/payment workflow, not when an item is added to a cart.
- The operation creates one pending payment attempt and must be idempotent for the same checkout and idempotency key.

### Success Response

`201 Created`

```json
{
  "success": true,
  "data": {
    "paymentReference": "payment-reference",
    "providerOrderReference": "razorpay-order-reference",
    "status": "Pending",
    "expiresAt": "2026-08-24T12:15:00Z"
  }
}
```

The response must not expose provider secrets or raw credentials.

## 5. Confirmation and Webhooks

### Provider Confirmation

`POST /api/v1/payments/:paymentReference/confirm` is an internal/provider-facing operation. It may change payment state only after the provider result has been independently authenticated and validated.

### Razorpay Webhook

`POST /api/v1/payments/webhooks/razorpay` is the authoritative payment confirmation path. The service must:

1. Verify the Razorpay webhook signature using server-side configuration.
2. Validate the internal payment reference and provider order/payment references.
3. Compare amount, currency, customer checkout, and expected payment state.
4. Store the provider event/reference with a uniqueness constraint.
5. Finalize exactly one Payment Transaction for a successful payment.
6. Confirm reserved inventory and create exactly one customer-facing Order after authoritative success.
7. Release reservations when the payment fails or expires.
8. Queue notifications and reconciliation work without rolling back the payment transaction.

Payment status may become successful only after the provider response or webhook is authenticated/cryptographically verified and reconciled with the internal payment reference, provider transaction ID, amount, currency, and order.

A client-side success message is never authoritative. Duplicate callbacks must not create duplicate successful transactions or orders.

## 6. Payment Rules

- Pending, failed, expired, and cancelled attempts must not mark an Order as paid.
- A successful transaction must reference the correct Order and Customer.
- Provider transaction IDs and internal payment references must be unique where applicable.
- Payment credentials and secrets must never be stored raw, returned, or logged.
- Sellers cannot modify payment records.
- Payment records must remain available for refund, settlement, reconciliation, audit, and reporting.
- Refunds must reference the original successful Payment Transaction.
- If payment succeeds but order creation fails, retain the successful transaction and create a reconciliation item for retry/compensation; do not ask the customer to pay again automatically.
- Duplicate client requests and duplicate provider callbacks must return the existing result without creating another order, transaction, or stock confirmation.

## 7. Responses

A successful initiation may return a provider-safe checkout reference and pending status. A successful confirmation returns the finalized transaction status and associated order reference without exposing provider secrets.

## 8. Errors

`PAYMENT_NOT_FOUND`, `PAYMENT_ACCESS_DENIED`, `PAYMENT_METHOD_NOT_SUPPORTED`, `PAYMENT_ATTEMPT_LIMIT_REACHED`, `PAYMENT_ALREADY_PROCESSED`, `PAYMENT_FAILED`, `PAYMENT_EXPIRED`, `PAYMENT_AMOUNT_MISMATCH`, `PAYMENT_CURRENCY_MISMATCH`, `PAYMENT_CHECKOUT_INVALID`, `INVALID_PROVIDER_CALLBACK`, `PAYMENT_REFERENCE_CONFLICT`, `PAYMENT_RECONCILIATION_REQUIRED`, `INVENTORY_RESERVATION_FAILED`, and `VALIDATION_ERROR`.

## 9. Idempotency, Audit, and Security

Payment initiation, confirmation, webhook processing, expiry handling, and reconciliation must be idempotent. The same logical payment attempt must not produce duplicate financial records, orders, or inventory effects.

The system must audit payment initiation, status transitions, verified webhook events, rejected callbacks, reconciliation, and administrative actions. Logs must redact secrets, signatures, tokens, and sensitive payment data.

## 10. Failure and Recovery Rules

- A failed or expired attempt releases its inventory reservation automatically.
- A delayed webhook is accepted only if it passes signature and reference validation; the resulting state must respect the payment state machine.
- A duplicate webhook returns a successful acknowledgement without repeating business effects.
- A gateway timeout leaves the attempt Pending until expiry or a verified provider result arrives.
- Reconciliation must identify successful provider payments without finalized internal orders and support a safe retry/compensation workflow.

## 11. Test Scenarios

- Customer initiates a valid INR Razorpay payment.
- Cash on Delivery is rejected.
- Unauthenticated or different-customer payment access is rejected.
- Payment initiation is rejected for stale pricing or unavailable inventory.
- The same idempotency key returns one payment attempt.
- A valid Razorpay webhook creates one successful transaction and one order.
- An invalid webhook signature cannot change payment state.
- Duplicate webhooks do not duplicate orders, transactions, or stock effects.
- A failed or expired payment releases its reservation.
- The fourth payment attempt for one checkout is rejected.
- A successful payment followed by order-creation failure enters reconciliation without a second charge.
- Provider secrets and payment credentials never appear in responses or logs.

## 12. Related Entities

Order, Customer Profile, Payment Pending, Payment Transaction, Refund, Settlement, Notification, Audit Log, Activity Log.
