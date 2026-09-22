# Order Management API

## Document Information

| Field | Value |
|---|---|
| Document Name | Order Management API |
| Product | Multi-Vendor Marketplace |
| API Version | v1 |
| Status | Draft |
| Parent Document | API Design |
| Related Documents | Shopping Management API, Inventory Management API, Payment Management API |

## 1. Overview

Order Management owns the customer-facing order lifecycle, order items, seller-specific visibility, cancellation, and order history. A multi-seller checkout creates one customer-facing Order containing Order Items grouped by Seller ID for fulfillment and settlement.

## 2. Endpoints

| Method | Endpoint | Actor | Purpose |
|---|---|---|---|
| POST | `/api/v1/checkout` | Customer | Validate cart, initiate payment, and create checkout context |
| POST | `/api/v1/orders` | Customer | Create an order from a successfully confirmed checkout |
| GET | `/api/v1/orders` | Customer | List own orders |
| GET | `/api/v1/orders/:orderId` | Customer | View own order |
| POST | `/api/v1/orders/:orderId/cancel` | Customer | Cancel eligible order/items |
| GET | `/api/v1/sellers/me/orders` | Seller | View own assigned order items |
| PATCH | `/api/v1/sellers/me/orders/:orderId/items/:orderItemId/status` | Seller | Update assigned fulfillment status |
| GET | `/api/v1/admin/orders` | Super Admin | View marketplace orders |
| GET | `/api/v1/admin/orders/:orderId` | Super Admin | View an order for administration |

## 3. Checkout and Creation Rules

- The customer must be authenticated.
- The cart must contain at least one valid item.
- Product status, category access, price, and inventory must be revalidated.
- Payment must be successfully confirmed before the order becomes Confirmed/Paid.
- Inventory deductions and order creation must be transactionally consistent or use a durable reservation workflow.
- One customer checkout creates one Order, with Order Items retaining each seller ID.
- Order Items snapshot product name, unit price, quantity, discounts, taxes, commission rate, commission amount, and applicable totals.
- The current Product or Category Commission records must never rewrite historical orders.
- Order numbers must be unique.
- Fulfillment statuses are Pending, Confirmed, Processing, Shipped, Delivered, Cancelled, Returned, and Refunded.
- Multi-seller orders may have multiple shipments grouped by seller/order item.
- Manual tracking data may include carrier, tracking number, dispatch date, delivery date, and proof of delivery.

## 4. Create Order

`POST /api/v1/orders`

```json
{
  "checkoutId": "checkout-id",
  "shippingAddressId": "address-id"
}
```

The checkout context must belong to the authenticated customer and contain validated cart, payment, pricing, and inventory information. The API must reject replayed or expired checkout contexts. Order creation is authoritative only after verified Razorpay payment confirmation. One successful customer checkout creates one Order, even when items belong to multiple sellers.

## 5. List and View Orders

Customers may view only their own Orders and Order Items. Sellers may view only Order Items belonging to their products, even when those items are part of a multi-seller customer Order. Super Admin access is administrative and must not expose unnecessary sensitive payment information.

Collection endpoints must support bounded pagination and approved filters such as status, date, and order number.

## 6. Cancellation

`POST /api/v1/orders/:orderId/cancel`

```json
{
  "orderItemIds": ["order-item-id"],
  "reason": "Customer changed mind"
}
```

The operation must validate ownership, current order/item state, cancellation eligibility, quantity, and payment/refund consequences. It may cancel the complete order or eligible individual items. Inventory release and refund initiation must be coordinated with their owning modules.

## 7. Seller Fulfillment

Sellers may view and update only their assigned Order Items. Seller status updates must validate the allowed lifecycle transition and must not alter payment, commission, or settlement history. Shipping-provider automation is outside Version 1; shipping information may be updated through the defined manual workflow. Cancellation is allowed only before shipment. Partial cancellation is supported for eligible order items and must coordinate proportional refund, inventory, notification, and commission effects.

## 8. Idempotency, Audit, and Security

Checkout, order creation, cancellation, and seller status updates require an idempotency key or durable operation reference. Replays must not create duplicate orders, refunds, inventory effects, or notifications. Customer and seller views enforce object-level authorization. Historical price, address, tax, discount, shipping, and commission snapshots are immutable.

## 9. Test Scenarios

- One multi-seller checkout creates one customer-facing order.
- Seller views expose only that seller's Order Items.
- Duplicate order creation does not duplicate orders or payment effects.
- Cancellation before shipment succeeds; cancellation after shipment is rejected.
- Individual eligible items can be cancelled without cancelling unrelated items.
- Invalid fulfillment transitions are rejected.
- Multiple seller shipments and tracking details are represented correctly.
- Product or address updates do not change historical order snapshots.

## 10. Errors

`ORDER_NOT_FOUND`, `ORDER_ACCESS_DENIED`, `ORDER_NOT_CANCELLABLE`, `ORDER_ALREADY_PROCESSED`, `CHECKOUT_EXPIRED`, `PAYMENT_REQUIRED`, `INSUFFICIENT_INVENTORY`, `INVALID_ORDER_STATE`, and `VALIDATION_ERROR`.

## 11. Idempotency and Audit

Order creation requires an idempotency key or equivalent checkout reference. Repeated requests must not create duplicate orders, inventory deductions, or payment effects. Cancellation and seller status changes must be safely repeatable and auditable.

## 12. Related Entities

Customer Profile, Address, Cart, Cart Item, Product, Inventory, Order, Order Item, Order Item History, Payment Pending, Payment Transaction, Return Request, Refund, Settlement Item, Notification, Audit Log, Activity Log.
