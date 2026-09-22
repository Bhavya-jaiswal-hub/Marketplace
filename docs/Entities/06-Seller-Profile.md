##  Seller Profile Entity

### Overview

The Seller Profile entity represents the seller-specific information associated with a User who wants to sell products on the marketplace.

A Seller Profile is created for a User who registers as a seller.

The Seller Profile contains seller-specific business information and maintains the seller's marketplace account status.

---

### Purpose

- Store seller-specific information.
- Associate a seller with a User account.
- Track seller account status.
- Support seller onboarding and verification.
- Support both Individual and Business sellers.

---

### Owned By

Seller Management

---

### Used By

- Seller Verification
- Category Management
- Product Management
- Inventory Management
- Order Management
- Settlement Management
- Notification Management
- Admin Dashboard

---

### Attributes

| Attribute | Description |
|-----------|-------------|
| Seller ID | Unique identifier for the seller |
| User ID | Associated User account |
| Seller Type | Individual or Business |
| Business Name | Business name when applicable |
| Display Name | Name displayed to customers |
| Seller Status | Current seller account status |
| Contact Email | Seller contact email |
| Contact Mobile | Seller contact number |
| Created At | Seller profile creation timestamp |
| Updated At | Last modification timestamp |

---

### Seller Types

The marketplace supports:

- Individual Seller
- Business Seller

The seller type determines which seller information and verification requirements apply.

---

### Seller Status

Possible seller statuses include:

- Pending
- Approved
- Rejected
- Suspended
- Blocked

---

### Validation Rules

- Every Seller Profile must belong to exactly one User.
- A User cannot have multiple Seller Profiles.
- Seller Type is mandatory.
- Seller Status is mandatory.
- Required seller information must be provided before verification.
- Business Name is required when the seller is registered as a Business, according to the applicable business requirements.
- Seller contact information must be valid.

---

### Business Rules

- A seller must complete the required registration information before verification.
- A seller cannot sell products until the seller account is approved.
- A rejected seller may resubmit the required information/documents.
- A suspended seller cannot perform seller operations.
- A blocked seller cannot access seller selling operations.
- Seller approval is performed by the Super Admin.
- Seller registration as an Individual or Business must be preserved as part of the seller profile.

---

### Relationships

A Seller Profile:

- Belongs to one User.
- Has one Seller Verification record.
- Has one Seller Address or associated seller address records as defined by the final address design.
- Can have many Seller Category records.
- Can own many Products.
- Can have many Orders through Order Items.
- Can have many Settlements.

High-level relationship:

```text
User
  │
  └─── 1 : 1 ─── Seller Profile
                    │
                    ├── 1 : 1 ─── Seller Verification
                    │
                    ├── 1 : Many ─── Seller Categories
                    │
                    ├── 1 : Many ─── Products
                    │
                    └── 1 : Many ─── Settlements 