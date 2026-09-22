##  Seller Address Entity

### Overview

The Seller Address entity stores the address information associated with a seller.

The address is used for seller verification, business identification, order fulfillment, and other seller-related operations where an address is required.

---

### Purpose

- Store seller address information.
- Support seller verification.
- Provide seller location information for business operations.
- Support future shipping and fulfillment requirements.

---

### Owned By

Seller Management

---

### Used By

- Seller Verification
- Product Management
- Order Management
- Shipping
- Settlement Management
- Admin Dashboard

---

### Attributes

| Attribute | Description |
|-----------|-------------|
| Address ID | Unique identifier for the address |
| Seller ID | Seller associated with the address |
| Address Type | Type of seller address |
| Address Line 1 | Primary address information |
| Address Line 2 | Additional address information |
| City | Seller's city |
| State | Seller's state |
| Postal Code | Seller's postal code |
| Country | Seller's country |
| Is Primary | Indicates the primary seller address |
| Created At | Record creation timestamp |
| Updated At | Last modification timestamp |

---

### Address Types

The system may support:

- Business Address
- Pickup Address
- Registered Address

The exact address types used in the initial version shall depend on the final shipping and fulfillment requirements.

---

### Validation Rules

- Every address must belong to a valid Seller.
- Address Line 1 is mandatory.
- City is mandatory.
- State is mandatory.
- Postal Code is mandatory.
- Country is mandatory.
- Postal Code must follow the configured country format.
- A seller may have multiple addresses.
- Only valid seller-owned addresses may be used for seller operations.

---

### Business Rules

- Seller address information must be provided during the seller verification process where required.
- The Super Admin may view seller address information during verification.
- Sellers may update their address according to marketplace rules.
- Address changes to sensitive verification information may require re-verification if required by business policy.
- A seller must have at least one valid address required for marketplace operations.
- A seller cannot access or modify another seller's addresses.

---

### Relationships

A Seller Address:

- Belongs to one Seller.

```text
Seller Profile
      │
      └─── 1 : Many ─── Seller Address 