##  Category Commission Entity

### Overview

The Category Commission entity represents the commission percentage configured by the Super Admin for a specific category.

The commission determines how much of a seller's eligible product/order amount is retained by the marketplace as commission and how much becomes eligible for the seller's settlement.

The marketplace uses percentage-based commission.

Commission configuration is controlled exclusively by the Super Admin.

---

### Purpose

- Store the commission percentage for a category.
- Determine the marketplace commission on seller orders.
- Determine the seller's eligible settlement amount.
- Support different commission percentages for different categories.
- Support commission changes over time.
- Preserve historical commission configurations.
- Ensure commission changes do not affect existing orders.

---

### Owned By

Category Management

---

### Used By

- Category Management
- Product Management
- Order Management
- Payment Management
- Settlement Management
- Reporting
- Super Admin Dashboard

---

### Attributes

| Attribute           | Description |
| ------------------- | ----------- |
| Commission ID       | Unique identifier for the commission configuration |
| Category ID         | Category to which the commission applies |
| Commission Rate     | Percentage commission configured by the Super Admin |
| Effective From      | Date and time from which the commission becomes applicable |
| Effective To        | Date and time until which the commission configuration remains applicable |
| Status              | Current status of the commission configuration |
| Created By          | Super Admin who created the configuration |
| Created At          | Timestamp when the configuration was created |
| Updated At          | Timestamp when the configuration was last updated |

---

### Commission Type

The marketplace currently supports:

- Percentage-based commission

Example:

```text
Product Amount = ₹1,000
Commission Rate = 10%

Marketplace Commission = ₹100
Seller Eligible Amount = ₹900  

Commission Status

Possible statuses include:

Active
Inactive
Expired

Only an applicable active commission configuration should be used when calculating commission for a new order.

Validation Rules
Every commission configuration must belong to a valid category.
Commission rate is mandatory.
Commission rate must be percentage-based.
Commission rate cannot be negative.
Commission rate cannot exceed 100%.
Only an authorized Super Admin can create or change commission configurations.
A category should have only one applicable commission configuration for a given point in time.
Commission effective periods must not overlap for the same category.
Effective From must be earlier than Effective To when Effective To is specified.
Historical commission configurations must not be deleted in a way that breaks historical order calculations.
Business Rules
The Super Admin defines the commission percentage for each category.
Different categories may have different commission percentages.
A seller does not define their own commission.
Sellers cannot modify commission rates.
Customers cannot modify commission rates.
The Super Admin can change the commission rate for a category at any time.
A commission change applies only to new orders after the new commission becomes effective.
Existing orders must continue using the commission that was applicable when those orders were created.
Commission must be captured as part of the order's financial snapshot.
Historical orders must never be recalculated using a newer commission configuration.
Seller settlement calculations must use the commission applicable to the relevant order.
Commission changes must be auditable.
Commission Lifecycle
Created
   ↓
Active
   ↓
Replaced / Expired
   ↓
Inactive

Example:

Category: Shoes

Commission A
10%
Effective: January 1
        ↓
Admin changes commission
        ↓
Commission B
15%
Effective: February 1

Result:

Orders before February 1 → 10%
Orders from February 1   → 15%

The old 10% commission configuration remains available for historical reference.

Commission Snapshot Rule

When an order is created, the system must capture the commission applicable at that time.

Example:

Category Commission = 10%

Order Amount = ₹2,000

Commission Rate = 10%
Marketplace Commission = ₹200
Seller Eligible Amount = ₹1,800

If the Super Admin later changes the commission to 15%:

Existing Order
Commission Rate = 10%
Commission      = ₹200

The existing order must remain unchanged.

A new order created after the new commission becomes effective uses:

New Order
Commission Rate = 15%

This prevents historical financial records from changing when the Super Admin changes the category commission.

Seller Settlement Relationship

The Category Commission directly affects the amount that becomes eligible for seller settlement.

Conceptually:

Customer Payment
       ↓
Order Amount
       ↓
Marketplace Commission
       ↓
Seller Eligible Amount
       ↓
Weekly Settlement

The final seller settlement amount may additionally consider:

Refunds
Returns
Cancellations
Shipping charges
Discounts
Taxes
Other financial adjustments

These rules will be finalized during the Order, Payment, Refund, and Settlement designs.

Multi-Seller Order Consideration

A single customer order may contain products from multiple sellers.

Therefore, commission must be calculated independently for each applicable seller/product category.

Example:

Customer Order
│
├── Seller A
│   └── Shoes
│       Amount = ₹1,000
│       Commission = 10%
│
└── Seller B
    └── T-Shirts
        Amount = ₹500
        Commission = 15%

The system must calculate the marketplace commission separately for each applicable seller/product category.

The exact internal order-splitting structure will be finalized during the Order database and architecture design.

Category Relationship

Each category can have different commission configurations over time.

Example:

Shoes
 ├── 10% → January
 ├── 12% → February
 └── 15% → March

Another category can have its own independent commission:

T-Shirts
 ├── 8%  → January
 └── 10% → February

Therefore, commission configuration is category-specific.

Product Relationship

Products are associated with categories.

The Product entity should not permanently store the current commission percentage because the Super Admin can change the commission later.

The applicable commission is determined when the order is created and preserved in the order's financial snapshot.

Order Relationship

When a customer places an order containing a seller's product:

The system identifies the product category.
The system identifies the applicable commission configuration.
The commission rate is captured in the order financial snapshot.
The marketplace commission is calculated.
The seller's eligible amount is calculated.
The order becomes part of the seller's future settlement according to settlement rules.
Relationships

A Category Commission:

Belongs to one Category.
Is created by one Super Admin.
May be referenced by multiple orders through the commission snapshot stored in the order financial records.
Category
   │
   └─── 1 : Many ─── Category Commission
                           │
                           └── Created By ─── Super Admin

The relationship between a commission configuration and an order is historical rather than a live dependency.

The order must preserve the commission information that was applicable when the order was created.

Security Considerations
Only the Super Admin can create or modify category commission configurations.
Sellers cannot modify commission configurations.
Customers cannot modify commission configurations.
Commission management APIs must require Super Admin authorization.
Commission changes must be recorded in the audit system.
Historical commission information must remain protected from unauthorized modification.
Financial commission data must not be exposed unnecessarily through public APIs.
Audit Requirements

The following commission operations should be auditable:

Commission created.
Commission changed.
Commission activated.
Commission deactivated.
Commission replaced.
Commission configuration viewed by authorized administrative users when required by audit policy.

Audit records should capture:

Who performed the action.
Which category was affected.
Previous commission rate.
New commission rate.
When the change occurred.
Effective date of the new configuration.
Future Enhancements

The commission system may later support:

Seller-specific commission rates.
Product-specific commission rates.
Subcategory-specific commission rates.
Commission tiers.
Promotional commission rates.
Time-limited commission campaigns.
Commission caps.
Minimum commission amounts.
Seller performance-based commissions.
Different commission rules for different seller types.

These features are not part of the initial implementation unless explicitly approved by the Super Admin/Product Owner.

Notes

Category Commission is intentionally separated from the Category entity because commission rates can change over time.

Historical commission information must remain available so that:

Previous orders can be audited.
Seller settlements can be calculated correctly.
Financial reports remain accurate.
Commission changes do not affect historical transactions.

The database design must preserve the commission rate and applicable financial values at the order level rather than relying only on the current Category Commission record.

The exact financial schema, including commission snapshots, taxes, discounts, shipping charges, refunds, cancellations, and settlement deductions, will be finalized during the detailed Order, Payment, Refund, and Settlement database design.