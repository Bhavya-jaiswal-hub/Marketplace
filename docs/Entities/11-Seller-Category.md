
##  Seller Category Entity

### Overview

The Seller Category entity represents a seller's permission to sell products within a specific category.

A category can be used by multiple sellers, but each seller must have an independent category approval.

For example:

    Category: Shoes

    Seller A → Approved
    Seller B → Approved
    Seller C → Rejected
    Seller D → Pending

The Seller Category entity stores these seller-specific category permissions.

---

### Purpose

- Connect sellers with categories.
- Track category approval requests.
- Control which categories a seller is allowed to sell in.
- Support adding new categories after seller onboarding.
- Maintain category approval history.

---

### Owned By

Category Management

---

### Used By

- Seller Management
- Product Management
- Super Admin
- Product Validation
- Reporting
- Notification Management

---

### Attributes

| Attribute             | Description                                      |
| --------------------- | ------------------------------------------------ |
| Seller Category ID    | Unique identifier                                |
| Seller ID             | Seller requesting category access                |
| Category ID           | Category being requested                         |
| Status                | Current approval status                          |
| Requested At          | Timestamp when seller requested the category     |
| Reviewed At           | Timestamp when Super Admin reviewed the request  |
| Reviewed By           | Super Admin who reviewed the request             |
| Rejection Reason      | Reason provided when category access is rejected |
| Revoked At            | Timestamp when category permission was revoked   |
| Revocation Reason     | Reason for revocation                            |
| Created At            | Record creation timestamp                        |
| Updated At            | Last modification timestamp                     |

---

### Status

Possible statuses include:

- Pending
- Approved
- Rejected
- Revoked

---

### Validation Rules

- Seller ID must reference a valid Seller.
- Category ID must reference a valid Category.
- A seller cannot have multiple active requests for the same category.
- An approved seller category must reference an approved seller.
- Rejected requests must contain a rejection reason when required.
- Revoked permissions must contain a revocation reason when required.
- Only authorized Super Admins can approve, reject, or revoke category permissions.

---

### Business Rules

- A seller must request approval before selling products in a category.
- The Super Admin approves or rejects the seller's category request.
- A seller can request additional categories after initial seller approval.
- Approving one category does not approve any other category.
- Multiple sellers can be approved for the same category.
- If a category request is rejected, the seller cannot create products under that category.
- The Super Admin can revoke a seller's category permission later.
- A seller cannot sell new products in a revoked category.
- Existing historical orders and products must remain traceable even if category permission is later revoked.
- Category permission is independent for every seller.

---

### Category Approval Lifecycle

    Pending
       │
       ├──→ Approved
       │       │
       │       └──→ Revoked
       │
       └──→ Rejected

A rejected request may be submitted again according to the category approval workflow.

---

### Relationships

A Seller Category:

- Belongs to one Seller.
- Belongs to one Category.
- May be reviewed by one Super Admin.

```text
Seller
  │
  └─── 1 : Many ─── Seller Category ─── Many : 1 ─── Category
                           │
                           └── Reviewed By ─── Super Admin 