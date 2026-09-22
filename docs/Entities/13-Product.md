Product Entity
Overview

The Product entity represents a product listed on the marketplace by a seller or the Super Admin.

A product belongs to one seller and one category.

The Product entity stores the core information of a product, while product images, specifications, and inventory are managed through their respective entities.

Purpose
Store core product information.
Associate a product with its seller.
Associate a product with its category.
Store the current selling price.
Manage the product's lifecycle status.
Support product listing and marketplace browsing.
Provide the product reference for cart, order, inventory, and settlement operations.
Owned By

Product Management

Used By
Seller Management
Category Management
Inventory Management
Shopping Management
Order Management
Payment Management
Return & Refund Management
Settlement Management
Customer Marketplace
Admin Dashboard
Reporting
Attributes
Attribute	Description
Product ID	Unique identifier for the product
Seller ID	Seller who owns the product
Category ID	Category under which the product is listed
Product Name	Name of the product
Description	Detailed description of the product
SKU	Unique stock keeping identifier for the product
Price	Current selling price of the product
Status	Current status of the product
Created At	Record creation timestamp
Updated At	Last modification timestamp
Deleted At	Timestamp of soft deletion, if applicable
Product Status

Possible statuses include:

Active
Paused
Hidden
Deleted

Out of Stock is primarily an inventory condition and is handled through the Inventory entity.

Product Ownership
Every product must belong to one seller.
The Super Admin can also own and sell products.
Multiple sellers can sell products under the same category.
A seller can manage only their own products.
A seller cannot manage another seller's products.
A seller cannot manage Super Admin-owned products.
Category Requirement

A seller must have valid approval for a category before creating a product under that category.

Seller
   │
   ↓
Seller Category Approval
   │
   ↓
Approved Category
   │
   ↓
Product

Category approval is seller-specific.

For example, approval for the Shoes category for Seller A does not automatically approve Seller B for the same category.

Validation Rules
Product name is mandatory.
Product price is mandatory.
Product price cannot be negative.
Product must belong to a valid Seller.
Product must belong to a valid Category.
SKU must follow the marketplace SKU rules.
SKU must be unique according to the marketplace rules.
Product status must contain a valid status.
A seller must have valid category approval before creating a product under that category.
A seller cannot create or modify a product belonging to another seller.
A seller cannot create or modify a Super Admin-owned product.
Product references must maintain valid relationships with Seller and Category.
Deleted products must not be available for normal customer purchase.
Business Rules
A product belongs to exactly one seller.
The Super Admin can sell products.
Multiple sellers can sell products under the same category.
Individual product approval is not required in the current marketplace workflow.
Category approval is required before a seller can create products under that category.
A seller can create products only under categories for which the seller has valid approval.
A seller can edit, pause, hide, duplicate, and delete their own products.
A seller cannot manage another seller's products.
A seller cannot manage Super Admin-owned products.
Product images are managed through the Product Image entity.
Product specifications are managed through the Product Specification entity.
Current stock is managed through the Inventory entity.
When inventory reaches zero, the product must not be available for purchase.
Product price represents the current selling price.
Historical order prices must not be changed when the current product price changes.
Historical order information must retain the applicable product price at the time of purchase.
Product deletion should preserve historical references where required.
Product management operations should be auditable.
Product Lifecycle
Created
   │
   ↓
Active
   │
   ├──→ Paused
   │       │
   │       └──→ Active
   │
   ├──→ Hidden
   │       │
   │       └──→ Active
   │
   └──→ Deleted

A product can be purchased only when its status and inventory conditions allow it.

Relationships

A Product:

Belongs to one Seller.
Belongs to one Category.
Has multiple Product Images.
Has multiple Product Specifications.
Has an Inventory record.
Can be referenced by multiple Cart Items.
Can be referenced by multiple Order Items.
Seller
  │
  └─── 1 : Many ─── Product ─── Many : 1 ─── Category
                       │
                       ├─── 1 : Many ─── Product Image
                       │
                       ├─── 1 : Many ─── Product Specification
                       │
                       ├─── 1 : 1 ───── Inventory
                       │
                       ├─── 1 : Many ─── Cart Item
                       │
                       └─── 1 : Many ─── Order Item 