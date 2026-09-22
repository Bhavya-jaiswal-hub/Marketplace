# Inventory Management API

## Document Information

| Field | Value |
|---|---|
| Document Name | Inventory Management API |
| Product | Multi-Vendor Marketplace |
| API Version | v1 |
| Status | Draft |
| Parent Document | API Design |
| Related Documents | Product Management API, Order Management API |

## 1. Overview

Inventory Management owns current stock, stock validation, atomic deductions, restocking, and inventory history. Sellers may manage inventory only for their own products. Order and cart workflows must use Inventory Management interfaces rather than changing stock directly.

## 2. Endpoints

| Method | Endpoint | Actor | Purpose |
|---|---|---|---|
| GET | `/api/v1/sellers/me/inventory` | Seller | List own inventory |
| GET | `/api/v1/sellers/me/products/:productId/inventory` | Seller | View product stock |
| PATCH | `/api/v1/sellers/me/products/:productId/inventory` | Seller | Adjust product stock |
| GET | `/api/v1/sellers/me/products/:productId/inventory/history` | Seller | View stock history |
| POST | `/api/v1/inventory/validate` | Internal service | Validate availability |
| POST | `/api/v1/inventory/reservations` | Internal service | Reserve stock for checkout |
| POST | `/api/v1/inventory/reservations/:reservationId/confirm` | Internal service | Commit a reservation |
| POST | `/api/v1/inventory/reservations/:reservationId/release` | Internal service | Release reserved stock |

## 3. Rules

- Inventory belongs to exactly one product.
- Stock cannot become negative.
- Sellers can update only inventory for their own products.
- Stock deductions for checkout must be atomic and concurrency-safe.
- Zero available stock makes a product unavailable for purchase.
- Every addition, deduction, cancellation, return, and manual adjustment creates Inventory History.
- A failed payment or cancelled checkout must release its reservation according to the checkout policy.
- Inventory operations must be idempotent when retried with the same operation reference.

## 4. Update Stock

`PATCH /api/v1/sellers/me/products/:productId/inventory`

Requires an approved seller and ownership of the product.

```json
{
  "quantity": 25,
  "reason": "RESTOCK"
}
```

The quantity and reason must be valid. The operation must reject insufficient information, negative resulting stock, unauthorized ownership, and invalid product state.

## 5. Internal Stock Operations

Validation, reservation, confirmation, and release are business interfaces used by Cart, Order, Payment, and Return/Refund modules. They must not be exposed as unrestricted customer operations.

## 6. Errors

`INVENTORY_NOT_FOUND`, `PRODUCT_ACCESS_DENIED`, `INSUFFICIENT_INVENTORY`, `INVENTORY_CONFLICT`, `INVALID_INVENTORY_OPERATION`, `RESERVATION_EXPIRED`, and `VALIDATION_ERROR`.

## 7. Reservation Lifecycle

```text
Available -> Reserved -> Confirmed
                     -> Released
```

Reservations are created during checkout/payment, have an expiry, and cannot exceed available stock. Payment failure, payment expiry, checkout cancellation, or reservation expiry releases stock. Ordinary cart addition does not reserve stock.

## 8. Idempotency, Audit, and Security

Reservation, confirmation, release, restock, and manual adjustment require an operation reference. Retries return the existing result. Concurrent requests must use transactional locking or an equivalent atomic mechanism. Every stock change records its actor, reason, previous quantity, and resulting quantity in Inventory History.

## 9. Test Scenarios

- Negative stock and deductions beyond available quantity are rejected.
- Concurrent reservations cannot oversell a product.
- Repeated reservation, confirmation, or release does not duplicate its stock effect.
- Failed or expired payment releases the reservation.
- A seller cannot change another seller's inventory.
- Accepted returned goods are restocked only after inspection completion.

## 10. Related Entities

Product, Inventory, Inventory History, Cart Item, Order Item, Payment Pending, Return Request, Audit Log, Activity Log.
