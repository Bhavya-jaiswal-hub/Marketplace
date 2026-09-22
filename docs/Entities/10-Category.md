##  Category Entity

### Overview

The Category entity represents a product category available within the marketplace.

Categories organize products into logical groups and may contain subcategories.

A category can be created by the Super Admin for the marketplace and may be used by sellers only after the seller receives approval to sell within that category.

---

### Purpose

- Organize marketplace products.
- Support category and subcategory structures.
- Provide a classification system for products.
- Support seller category approval.
- Support category-based commission configuration.

---

### Owned By

Category Management

---

### Used By

- Seller Management
- Product Management
- Marketplace
- Search
- Inventory
- Order Management
- Settlement Management
- Reporting
- Super Admin

---

### Attributes

| Attribute | Description |
|-----------|-------------|
| Category ID | Unique identifier for the category |
| Parent Category ID | Reference to the parent category when applicable |
| Name | Category name |
| Slug | URL-friendly unique identifier |
| Description | Description of the category |
| Owner Type | Identifies whether the category belongs to the Super Admin or is a seller category context |
| Owner ID | Owner reference when applicable |
| Status | Current category status |
| Created By | User who created the category |
| Created At | Record creation timestamp |
| Updated At | Last modification timestamp |

---

### Category Structure

Categories may contain subcategories.

Example:

```text
Clothing
│
├── Men's Clothing
│   ├── T-Shirts
│   ├── Shirts
│   └── Jeans
│
└── Women's Clothing
    ├── Dresses
    ├── Tops
    └── Jeans  

Notes

A Category represents the marketplace classification itself.

A seller's permission to sell within a category is not stored directly on the Category entity.

That permission is represented separately by the Seller Category entity.

This separation allows: 

Category: Shoes

Seller A → Approved
Seller B → Approved
Seller C → Rejected
Seller D → Pending  