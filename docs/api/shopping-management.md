# Shopping and Cart Management API

## Document Information

| Field | Value |
|---|---|
| Document Name | Shopping and Cart Management API |
| Product | Multi-Vendor Clothing Marketplace |
| API Version | v1 |
| Status | Approved Baseline Specification |
| Parent Document | API Design |
| Source of Truth | [docs/SRS.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/SRS.md) (v1.2) |
| Last Updated | 2026-10-07 |

---

# 1. Overview

Shopping Management owns the authenticated customer's active multi-vendor cart and cart items. In Version 1, cart line items reference the specific purchasable **`ProductVariant` (`variantId`)** representing the chosen Size and Color combination.

Cart items are grouped by seller, with each seller group calculating its subtotal and dynamic free-shipping progress based on Admin-configured platform shipping thresholds (default seed placeholders: flat ₹79 fee, free shipping above ₹999 per seller).

---

# 2. Endpoints Summary

| Method | Endpoint | Actor | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/cart` | Customer | View active cart grouped by seller with free-shipping nudges |
| `POST` | `/api/v1/cart/items` | Customer | Add a clothing variant (`variantId`) to the cart |
| `PATCH` | `/api/v1/cart/items/:itemId` | Customer | Update requested variant quantity |
| `DELETE` | `/api/v1/cart/items/:itemId` | Customer | Remove a variant item from the cart |
| `POST` | `/api/v1/cart/validate` | Customer | Revalidate variant stock, prices, and seller status prior to checkout |
| `DELETE` | `/api/v1/cart` | Customer | Clear all items from active cart |

---

# 3. Add Item to Cart

## Endpoint
`POST /api/v1/cart/items`

## Authentication
Required (`CUSTOMER`).

## Request Body
```json
{
  "variantId": "11111111-2222-3333-4444-555555555555",
  "quantity": 2
}
```

## Business Rules & Stock Validation
1. `variantId` is mandatory and references an active `ProductVariant`. (Parent `productId` is not the purchasable entity).
2. The system checks available inventory: `variant.stock_quantity >= requested_quantity`.
3. If the variant has `stock_quantity = 0`, it is `Out of Stock` and cannot be added.
4. If the item already exists in the cart, the quantity is incremented, re-checking total requested quantity against available stock.
5. Adding an item to the cart does not hold a reservation lock; stock is atomically decremented only upon successful payment confirmation.

---

# 4. View Active Cart

## Endpoint
`GET /api/v1/cart`

## Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "cartId": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
    "sellerGroups": [
      {
        "sellerId": "d9b2d63d-a233-4123-8478-2c963f66afa6",
        "sellerName": "Vanguard Apparel",
        "sellerSubtotal": 1299.00,
        "shippingFee": 79.00,
        "freeShippingThreshold": 999.00,
        "amountRemainingForFreeShipping": 0.00,
        "isFreeShippingUnlocked": true,
        "items": [
          {
            "id": "item-uuid-1",
            "productId": "7b8e1f2a-89c4-4890-8021-9e7fbc8201a1",
            "variantId": "11111111-2222-3333-4444-555555555555",
            "productTitle": "Classic Cotton Oxford Shirt",
            "sku": "OXF-BLU-M",
            "size": "M",
            "color": "Sky Blue",
            "unitPrice": 1299.00,
            "quantity": 1,
            "itemTotal": 1299.00,
            "availableStock": 25,
            "isAvailable": true
          }
        ]
      },
      {
        "sellerId": "e2a1d63d-b444-4999-8478-2c963f66afa6",
        "sellerName": "Urban Threads",
        "sellerSubtotal": 599.00,
        "shippingFee": 79.00,
        "freeShippingThreshold": 999.00,
        "amountRemainingForFreeShipping": 400.00,
        "isFreeShippingUnlocked": false,
        "freeShippingNudgeMessage": "Add ₹400.00 more for free shipping from this seller",
        "items": [
          {
            "id": "item-uuid-2",
            "productId": "8c9e1f2a-99c4-4890-8021-9e7fbc8201b2",
            "variantId": "22222222-3333-4444-5555-666666666666",
            "productTitle": "Graphic Print Crewneck T-Shirt",
            "sku": "TEE-BLK-L",
            "size": "L",
            "color": "Black",
            "unitPrice": 599.00,
            "quantity": 1,
            "itemTotal": 599.00,
            "availableStock": 8,
            "isAvailable": true
          }
        ]
      }
    ],
    "summary": {
      "totalItems": 2,
      "itemsSubtotal": 1898.00,
      "totalShippingFee": 79.00,
      "grandTotal": 1977.00
    }
  },
  "message": "Cart retrieved successfully"
}
```

---

# 5. Pre-Checkout Stock & Price Revalidation

## Endpoint
`POST /api/v1/cart/validate`

## Business Rules on Stock Changes Before Checkout (SRS FR-6, FR-7, BR-5)
1. Before checkout or payment initiation, `POST /api/v1/cart/validate` evaluates all cart items against live database records.
2. **Out-of-Stock or Insufficient Stock:**
   - If any variant has `stock_quantity = 0`, it is flagged with status `OUT_OF_STOCK`.
   - If `stock_quantity < requested_quantity`, it is flagged with `INSUFFICIENT_STOCK` showing maximum purchasable quantity.
   - The checkout button is disabled until the customer adjusts the quantity or removes the item.
3. **Price Changes:**
   - If parent `product.price` changed while an item was in the cart, the cart is updated with the latest price and the customer is presented with an explicit price change notification banner to confirm before proceeding.
4. **Seller / Category Deactivation:**
   - If a seller is suspended or category permission is revoked, affected items are marked `SELLER_UNAVAILABLE` and must be removed to proceed.
