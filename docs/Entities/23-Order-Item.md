# Order Item Entity

## Overview

The Order Item entity represents a single clothing **Product Variant** purchased from a specific seller within a customer's parent Order.

The platform internally splits each parent order into discrete Order Items. Each item is fulfilled, tracked, cancelled, returned, and settled independently.

Every Order Item stores an **immutable financial snapshot** (product title, SKU, size, color, unit price, commission rate, commission amount, and shipping fee share) captured at the moment of payment confirmation.

## Purpose

- Track independent fulfillment lifecycle for each purchased variant.
- Associate each purchased item with its owning Seller.
- Enforce pre-shipment cancellation rules before dispatch (`Shipped`).
- Record seller manual delivery confirmation (`Delivered`) with courier and tracking details.
- Manage the customer **"Not received" dispute** workflow within the 7-day post-delivery window, target 3-business-day SLA, seller proof submission, and Admin arbitration.
- Preserve immutable financial records for commission calculation, refunds, and weekly seller settlements.

## Owned By

Order Management

## Used By

- Seller Management (Fulfillment Queue)
- Inventory Management (Restocking on Cancellation/Return)
- Return & Refund Management (5-Day Return Requests)
- Settlement Management (Weekly Payouts & Adjustments)
- Customer Management (Order History & Tracking)
- Admin Dashboard (Dispute Arbitration & Moderation)
- Reporting & Financial Analytics

## Attributes

| Attribute | Type | Nullable | Description |
|---|---|---|---|
| `id` | UUID | No | Unique identifier for the order item |
| `order_id` | UUID | No | Parent order reference (Foreign Key to `Order`) |
| `product_id` | UUID | No | Parent clothing product (Foreign Key to `Product`) |
| `variant_id` | UUID | No | Purchased variant (Foreign Key to `ProductVariant`) |
| `seller_id` | UUID | No | Seller responsible for fulfillment (Foreign Key to `SellerProfile` or Super Admin) |
| `status` | Enum | No | Order item status (see Section 8.1) |
| `courier_name` | String(100) | Yes | Logistics courier recorded by seller upon dispatch |
| `tracking_number` | String(100) | Yes | Courier AWB tracking number recorded upon dispatch |
| `shipped_at` | Timestamp | Yes | Timestamp when seller marked item as `Shipped` |
| `delivered_at` | Timestamp | Yes | Timestamp when seller manually marked item as `Delivered` |
| `product_name_snapshot` | String | No | Product name at time of purchase |
| `sku_snapshot` | String | No | Variant SKU at time of purchase |
| `size_snapshot` | String | No | Variant size selected at time of purchase |
| `color_snapshot` | String | No | Variant color selected at time of purchase |
| `unit_price` | Numeric(10, 2) | No | Selling price per unit (tax-inclusive snapshot) |
| `quantity` | Integer | No | Number of units purchased ($\ge 1$) |
| `item_subtotal` | Numeric(10, 2) | No | Total item value ($\text{unit\_price} \times \text{quantity}$) |
| `commission_rate` | Numeric(5, 2) | No | Category commission percentage locked at purchase |
| `commission_amount` | Numeric(10, 2) | No | Calculated platform commission ($\text{item\_subtotal} \times \text{commission\_rate}$) |
| `shipping_fee_share` | Numeric(10, 2) | No | Allocated share of the flat seller shipment fee |
| `not_received_reported_at` | Timestamp | Yes | Timestamp when customer reported non-delivery |
| `dispute_status` | Enum | No | Dispute status: `NONE`, `OPEN`, `RESOLVED_REFUNDED`, `RESOLVED_DELIVERED` (default: `NONE`) |
| `sla_due_at` | Timestamp | Yes | Target dispute SLA deadline (3 business days from report timestamp) |
| `seller_proof_notes` | Text | Yes | Seller's response, tracking notes, or delivery verification evidence |
| `seller_proof_document_url` | String(255) | Yes | URL to delivery slip, POD signature, or courier proof document |
| `resolution_outcome` | Enum | Yes | Resolution outcome: `CUSTOMER_REFUND_UPHELD`, `DISPUTE_REJECTED` |
| `resolved_by` | UUID | Yes | Foreign Key to `User` (Super Admin who resolved dispute) |
| `resolved_at` | Timestamp | Yes | Timestamp when dispute was resolved |
| `dispute_admin_notes` | Text | Yes | Resolution explanation recorded by Super Admin |
| `created_at` | Timestamp | No | Record creation timestamp |
| `updated_at` | Timestamp | No | Last modification timestamp |

## Order Item Statuses (SRS Section 8.1)

The Order Item entity strictly conforms to the statuses defined in **SRS Section 8.1**:

- **`Placed`:** Order created and payment confirmed; item awaiting seller fulfillment.
- **`Packed`:** Item packed and prepared for courier pickup by the seller.
- **`Shipped`:** Item handed over to courier; courier name and AWB tracking number recorded.
- **`Delivered`:** Seller manually marked item as delivered to customer (tracking ID recorded at `Shipped`); initiates 5-day return window and 7-day settlement countdown.
- **`Cancelled`:** Item cancelled prior to shipping by customer or seller; gateway refund processed.
- **`Not Received - Under Dispute`:** Customer reported item not received within 7 days of seller marking `Delivered`; escalated to Super Admin dispute review and blocks weekly settlement calculation until resolved.

## Business Rules (SRS FR-9, FR-12, FR-13, BR-7, BR-9, BR-11, BR-12, BR-13)

1. **Pre-Shipment Cancellation Cutoff (SRS BR-9, C-6):**
   - Customers may cancel any individual order item at any time **before** it is marked `Shipped`.
   - Once an item is `Shipped`, cancellation is disabled; customer must await delivery and initiate a return request within 5 days.
   - Sellers may cancel an item prior to shipping if stock is unavailable (triggers full customer refund).
2. **Partial vs. Full Cancellation Shipping Allocation (SRS FR-9, BR-9, AC-5):**
   - If a customer partially cancels items from a seller shipment and at least one item remains active, the flat shipping fee is retained.
   - If **all** items in that seller's shipment are cancelled, the shipping fee for that seller is refunded in full.
3. **Manual Delivery Confirmation (SRS FR-9, AC-5):**
   - Version 1 operates without direct courier API integration. The seller manually marks the item `Delivered` in the seller portal.
   - The `delivered_at` timestamp initiates the **5-day return window** and the **7-day settlement holding countdown**.
4. **7-Day "Not Received" Dispute Protection & SLA (SRS FR-9, BR-11, BR-12, AC-5):**
   - Customers may report "Not received" within **7 calendar days** of the seller's `Delivered` mark.
   - Reporting transitions the item to `Not Received - Under Dispute`, sets `dispute_status = OPEN`, sets `sla_due_at = 3 business days`, escalates the case to Super Admin, and **freezes weekly settlement** for that item until resolved.
   - Super Admin targets resolution within **3 business days**; the dashboard flags overdue disputes. There is no automated resolution on timeout.
   - Sellers may attach delivery proof (`seller_proof_notes`, `seller_proof_document_url`).
   - If resolved as `CUSTOMER_REFUND_UPHELD`, a full refund is issued to the customer and charged to the seller as a `DISPUTE_CHARGE_DEBIT` in the `SellerAdjustment` ledger.
   - If resolved as `DISPUTE_REJECTED`, the item reverts and becomes eligible for weekly settlement (once the 7-day post-delivery hold has elapsed).
5. **Immutable Financial Snapshot (SRS FR-5, FR-8, C-5):**
   - Price, SKU, Size, Color, and Commission values stored on the order item are permanent and never recalculate when catalog or commission rates change in the future.
6. **Admin Direct Retail (SRS FR-4, BR-7):**
   - For products sold directly by the Super Admin, `commission_rate = 0%`, `commission_amount = 0`, and no settlement records are generated.

## Relationships

An Order Item:
- Belongs to one parent **Order** (`N..1`).
- References one **Product** and one specific **Product Variant** (`N..1`).
- Belongs to one **Seller** (or Super Admin) (`N..1`).
- May be associated with one **Return Request** (`0..1`) and **Refund** (`0..1`).
- May generate **Seller Adjustment** records for disputes (`1..*`).
- Contributes to one **Settlement Item** (for third-party sellers once eligible).