# Shopping and Cart Management API

## Document Information

| Field | Value |
|---|---|
| Document Name | Shopping and Cart Management API |
| Product | Multi-Vendor Marketplace |
| API Version | v1 |
| Status | Draft |
| Parent Document | API Design |
| Related Documents | Product Management API, Inventory Management API, Order Management API |

## 1. Overview

Shopping Management owns the authenticated customer's active cart and cart items. A cart may contain products from multiple sellers, but checkout remains one customer-facing payment flow.

## 2. Endpoints

| Method | Endpoint | Actor | Purpose |
|---|---|---|---|
| GET | `/api/v1/cart` | Customer | View active cart |
| POST | `/api/v1/cart/items` | Customer | Add a product |
| PATCH | `/api/v1/cart/items/:itemId` | Customer | Change quantity |
| DELETE | `/api/v1/cart/items/:itemId` | Customer | Remove an item |
| POST | `/api/v1/cart/validate` | Customer | Validate cart before checkout |
| DELETE | `/api/v1/cart` | Customer | Clear active cart |

## 3. Rules

- Authentication is required to add, change, or remove cart items.
- A cart belongs to one customer.
- A cart item references one product and has a positive quantity.
- Products from multiple sellers may coexist in one cart.
- Product status, current price, and inventory must be revalidated at checkout.
- Adding an item does not guarantee stock reservation unless the finalized checkout policy explicitly reserves it.
- Deleted, hidden, paused, or unavailable products cannot be newly added.
- Cart operations must respect customer ownership.
- Authenticated customer carts persist across sessions and devices.
- Out-of-stock items remain visible but block checkout with a clear validation result.

## 4. Add Item

`POST /api/v1/cart/items`

```json
{
  "productId": "product-id",
  "quantity": 2
}
```

The product must exist, be purchasable, and have sufficient available stock for the requested quantity. Existing item quantities may be merged according to cart rules. Adding an item does not reserve stock, and repeated add requests must not create duplicate Cart Items for the same customer and product.

## 5. Update and Remove Items

Quantity must remain a positive integer. Updating or removing an item belonging to another customer must return an authorization error. Repeating removal of an absent item should be handled consistently without corrupting the cart.

## 6. Cart Validation

`POST /api/v1/cart/validate` rechecks product availability, current prices, seller/category eligibility, quantities, and totals before Order Management begins checkout. Validation must not create an order or mark payment successful.

## 7. Idempotency, Audit, and Security

All cart mutations require authenticated customer ownership. Add, update, remove, clear, and validate operations have deterministic retry behavior and do not reserve stock. Cart responses must not expose private seller, payment, or verification data.

## 8. Test Scenarios

- Unauthenticated users cannot mutate a cart.
- Products from multiple sellers coexist in one cart.
- Repeated add requests merge quantity without duplicate rows.
- Hidden, paused, deleted, unavailable, or out-of-stock products cannot be newly added.
- Price changes are reported during validation and require refreshed confirmation.
- A customer cannot access another customer's cart or items.

## 9. Errors

`CART_NOT_FOUND`, `CART_ITEM_NOT_FOUND`, `CART_ITEM_ACCESS_DENIED`, `PRODUCT_NOT_PURCHASABLE`, `INSUFFICIENT_INVENTORY`, `CART_CHANGED`, and `VALIDATION_ERROR`.

## 10. Related Entities

Customer Profile, Cart, Cart Item, Product, Inventory, Seller, Category, Order, Payment Pending, Activity Log.
