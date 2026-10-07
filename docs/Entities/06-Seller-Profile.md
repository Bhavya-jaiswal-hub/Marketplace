# Seller Profile Entity

## Overview

The Seller Profile entity represents the seller-specific business record associated with a registered User authorized or requesting to sell clothing apparel on the marketplace.

Sellers onboard as either an **Individual** or a **Business**, submitting mandatory KYC identification proofs (PAN, Aadhaar, address proof, photograph, bank account details, and an **optional GSTIN field** for Business merchants).

## Purpose

- Store seller merchant details, business type, contact info, and optional GSTIN.
- Associate the merchant profile with an authenticated User account.
- Maintain the authoritative Seller Account Status (`Pending Approval`, `Approved`, `Rejected`, `Suspended`, `Blocked`).
- Provide the primary ownership entity for clothing product listings, order fulfillment queues, and weekly settlements.

## Owned By

Seller Management

## Used By

- Seller Verification
- Category Management & Category Authorization
- Product Management & Product Variant Management
- Inventory Management
- Order Management (Fulfillment Queue)
- Settlement Management (Weekly Payouts)
- Admin Dashboard (Seller KYC Review & Moderation)

## Attributes

| Attribute | Type | Description |
|---|---|---|
| Seller ID | UUID | Unique identifier for the seller profile |
| User ID | UUID | User account reference (Foreign Key to `User`, Unique) |
| Seller Type | Enum | Merchant classification: `INDIVIDUAL` or `BUSINESS` |
| Business Name | String (Nullable) | Registered business name (mandatory for `BUSINESS` type) |
| Display Name | String | Storefront brand / seller display name shown to customers |
| GSTIN | String (Nullable) | Optional Goods and Services Tax Identification Number |
| Status | Enum | Seller account status (see Section 8.6) |
| Contact Email | String | Operational contact email address |
| Contact Mobile | String | Operational contact mobile number |
| Created At | Timestamp | Record creation timestamp |
| Updated At | Timestamp | Last modification timestamp |

## Seller Account Statuses (SRS Section 8.6)

The Seller Profile strictly conforms to the statuses defined in **SRS Section 8.6**:

- **`Pending Approval`:** Newly registered seller awaiting Super Admin KYC document verification.
- **`Approved`:** Verified seller authorized to request categories, list clothing products, and fulfill orders.
- **`Rejected`:** Verification documents rejected by Super Admin with mandatory feedback (seller may resubmit).
- **`Suspended`:** Reversible administrative suspension (listings temporarily hidden; seller dashboard restricted).
- **`Blocked`:** Permanent or indefinite administrative block due to fraud, severe policy violations, or malicious activity (access barred).

## Validation Rules

1. Every Seller Profile must belong to a valid authenticated `User`.
2. `Seller Type` is mandatory (`INDIVIDUAL` or `BUSINESS`).
3. `Display Name`, `Contact Email`, and `Contact Mobile` are mandatory.
4. `Business Name` is mandatory if `Seller Type = BUSINESS`.
5. `GSTIN`, if provided, must follow the Indian 15-character alphanumeric GST format.
6. Sellers in `Pending Approval`, `Rejected`, `Suspended`, or `Blocked` statuses cannot publish active product listings or initiate fulfillment operations.

## Relationships

A Seller Profile:
- Belongs to one **User**.
- Has one **Seller Verification** record.
- Has many **Verification Documents** (PAN, Aadhaar, Address, Photo).
- Has one or more **Seller Addresses** (Pickup / Return address).
- Has many **Seller Category** authorizations.
- Owns many **Products** and **Product Variants**.
- Has many **Settlement** records.

```
User
  │
  └─── 1 : 1 ─── Seller Profile
                       │
                       ├─── 1 : 1 ─── Seller Verification
                       ├─── 1 : Many ─── Verification Document
                       ├─── 1 : Many ─── Seller Address
                       ├─── 1 : Many ─── Seller Category
                       ├─── 1 : Many ─── Product
                       └─── 1 : Many ─── Settlement
```