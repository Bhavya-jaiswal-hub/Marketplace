##  Role Entity

### Overview

The Role entity defines the permissions category assigned to a user within the marketplace.

The current system supports three primary roles:

- Customer
- Seller
- Super Admin

Roles determine which parts of the system a user is authorized to access.

---

### Purpose

- Define user roles.
- Support Role-Based Access Control (RBAC).
- Control access to protected resources.
- Provide a foundation for future permission management.

---

### Owned By

Identity & Access Management

---

### Used By

- Authentication
- Authorization
- User Management
- Seller Management
- Customer Management
- Admin Management

---

### Attributes

| Attribute | Description |
|-----------|-------------|
| Role ID | Unique identifier for the role |
| Role Name | Name of the role |
| Description | Purpose of the role |
| Created At | Record creation timestamp |
| Updated At | Last modification timestamp |

---

### Current Roles

| Role | Responsibility |
|------|----------------|
| Customer | Browses products and purchases products |
| Seller | Manages approved categories, products, inventory, and seller operations |
| Super Admin | Manages the marketplace, verifies sellers/categories, manages commissions, refunds, settlements, and own products |

---

### Validation Rules

- Role name must be unique.
- Every user must have a valid role.
- A user must not have an undefined role.
- System-required roles cannot be deleted.

---

### Business Rules

- A user is assigned a role during account creation or onboarding.
- A Customer cannot perform Seller operations.
- A Seller cannot perform Super Admin operations.
- The Super Admin has administrative access to marketplace management.
- A user's role cannot be changed by the user.
- Role changes, if required, can only be performed through authorized administrative operations.

---

### Relationships

A Role may be assigned to many Users.

```text
Role
  │
  └─── 1 : Many ─── User 