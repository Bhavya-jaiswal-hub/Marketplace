# Return Request Entity

## Overview

The Return Request entity represents a formal return request submitted by a customer for an individual purchased clothing **Order Item**.

In Version 1, return requests are governed by a strict **5-day inspection window** commencing when the seller marks the item as `Delivered`.

Returns follow a multi-stage workflow involving Super Admin eligibility validation, customer return shipment, physical inspection by the seller, administrative dispute arbitration (if contested), and automated gateway refund processing.

## Purpose

- Record customer return requests submitted within 5 days of delivery.
- Associate the return with the specific Order Item and Customer.
- Track the full 8-stage return lifecycle from request through physical inspection to refund.
- Classify fault allocation (**Seller Fault** vs. **Customer Discretion**) to determine who bears the return shipping cost.
- Support Super Admin arbitration on disputed inspection rejections.
- Trigger gateway refunds and automated variant restocking upon approved return verification.

## Owned By

Return & Refund Management

## Used By

- Customer Management (Return Self-Service)
- Order Management (Order Item Status Tracking)
- Inventory Management (Restocking Verified Returns)
- Payment Management (Gateway Refund Initiation)
- Seller Management (Physical Inspection Queue)
- Settlement Management (Deducting Seller-Fault Return Shipping)
- Admin Dashboard (Return Dispute Arbitration)

## Attributes

| Attribute | Type | Description |
|---|---|---|
| Return Request ID | UUID | Unique identifier for the return request |
| Order ID | UUID | Parent order reference (Foreign Key to `Order`) |
| Order Item ID | UUID | Order item being returned (Foreign Key to `OrderItem`) |
| Customer ID | UUID | Customer who initiated the return (Foreign Key to `User`) |
| Seller ID | UUID | Seller who fulfilled the item |
| Status | Enum | Return lifecycle status (see Section 8.3) |
| Reason | String | Mandatory return reason (e.g., Defective, Wrong Item, Size Misfit, Remorse) |
| Customer Comments | Text (Nullable) | Additional explanation provided by the customer |
| Proof Photos | Array of URLs | Optional photos uploaded by customer demonstrating condition/defect |
| Fault Classification | Enum | Fault allocation: `SELLER_FAULT` or `CUSTOMER_FAULT` |
| Return Courier Name | String (Nullable) | Courier used by customer to ship item back (`In Transit`) |
| Return Tracking Number | String (Nullable) | Return tracking ID provided by customer |
| Inspection Outcome | Enum (Nullable) | Seller physical inspection result: `VERIFIED` or `REJECTED_ON_INSPECTION` |
| Inspection Rejection Reason | Text (Nullable) | Mandatory reason if seller rejects return on physical inspection |
| Return Shipping Deduction | Numeric | Return shipping cost deducted from seller settlement if `SELLER_FAULT` |
| Admin Dispute Notes | Text (Nullable) | Binding determination notes logged by Super Admin during arbitration |
| Requested At | Timestamp | Timestamp when customer submitted return request |
| Approved At | Timestamp (Nullable) | Timestamp when Super Admin approved return eligibility |
| Received At | Timestamp (Nullable) | Timestamp when seller acknowledged package receipt |
| Inspected At | Timestamp (Nullable) | Timestamp when seller completed physical inspection |
| Refunded At | Timestamp (Nullable) | Timestamp when payment gateway refund was executed |
| Created At | Timestamp | Record creation timestamp |
| Updated At | Timestamp | Last modification timestamp |

## Return Statuses (SRS Section 8.3)

The Return Request entity strictly conforms to the 8 statuses defined in **SRS Section 8.3**:

- **`Requested`:** Customer submitted return request within the 5-day delivery window; awaiting Admin review.
- **`Approved`:** Admin approved return eligibility; customer authorized to ship product to seller.
- **`Rejected`:** Admin rejected return request (e.g., out of window or non-compliant reason); process closed.
- **`In Transit`:** Customer provided return courier tracking details; package in transit to seller.
- **`Received`:** Seller confirmed physical receipt of return package at facility.
- **`Verified`:** Seller inspected item, confirmed acceptable condition, and accepted return.
- **`Rejected on Inspection`:** Seller inspected item and rejected return due to damage, wear, or missing tags (dispute escalated to Admin).
- **`Refunded`:** Admin approved refund following verification or dispute resolution; gateway refund triggered.

## Fault Allocation & Return Shipping Cost Rules (SRS FR-11, BR-11, AC-6)

1. **Seller Fault** *(Defective product, wrong size/item sent, damaged, not as listed)*:
   - **Return Shipping Cost:** Borne by the **Seller** (deducted from seller's weekly settlement payout via `Return Shipping Deduction`).
   - **Customer Refund:** Full refund of item price. Original shipping fee is refunded only if **all** items in that seller's shipment were returned due to seller fault.
2. **Customer Discretion** *(Size/fit preference, buyer remorse, change of mind)*:
   - **Return Shipping Cost:** Borne by the **Customer**.
   - **Customer Refund:** Refund of item price only (original shipping fee is retained by marketplace).
3. **Tax-Inclusive Refund Calculation:** Refunds are based on the actual price paid (tax-inclusive). No separate proportional tax calculation or TCS deduction occurs in Version 1.

## Validation Rules

1. Return request must be created within **5 calendar days** of the seller marking the Order Item `Delivered`.
2. Return requests are permitted only for items in `Delivered` status with no existing open return or dispute.
3. `Reason` and `Fault Classification` are mandatory.
4. When moving to `In Transit`, `Return Courier Name` and `Return Tracking Number` are mandatory.
5. When moving to `Rejected on Inspection`, `Inspection Rejection Reason` is mandatory.
6. A return request cannot be marked `Refunded` without prior `Verified` inspection or Super Admin dispute resolution.

## Relationships

A Return Request:
- References one **Order** and one **Order Item**.
- Belongs to one **Customer**.
- Belongs to one **Seller**.
- Results in one **Refund** record upon final approval.
- Restocks the variant's **Inventory** record upon `Verified` inspection.

```
Order Item
  │
  └─── 1 : 1 ─── Return Request
                       │
                       ├─── 1 : 1 ─── Refund
                       └─── Restocks ─── Product Variant Inventory
```