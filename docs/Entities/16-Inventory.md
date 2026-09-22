Inventory Entity

# Overview

The Inventory entity stores the current stock information for a Product.

It determines how many units of a product are currently available for purchase and supports stock management throughout the product lifecycle.

Inventory is maintained separately from the Product entity because stock is operational data that changes independently from the product's core information.

 # Purpose
Store the current available stock of a product.
Track stock availability for purchasing.
Support seller inventory management.
Prevent purchases when sufficient stock is unavailable.
Support automatic out-of-stock behavior.
Provide inventory information for order processing. 

 # Owned By

Inventory Management

# Used By
Product Management
Seller Management
Shopping Management
Order Management
Customer Marketplace
Reporting
Admin Dashboard

# Attributes
Attribute	Description
Inventory ID	Unique identifier for the inventory record
Product ID	Product associated with the inventory
Available Quantity	Current quantity available for purchase
Reserved Quantity	Quantity temporarily reserved for pending order processing, when applicable
Created At	Record creation timestamp
Updated At	Last modification timestamp

# Inventory Status

Inventory availability may be determined using the available quantity.

Possible conditions include:

In Stock
Low Stock
Out of Stock

The exact threshold for Low Stock may be configured according to marketplace requirements.

When available quantity reaches zero, the product must become unavailable for purchase.

 # Validation Rules
Every Inventory record must belong to a valid Product.
A Product should have only one active Inventory record.
Available Quantity cannot be negative.
Reserved Quantity cannot be negative.
Reserved Quantity must not exceed the available inventory according to the final reservation model.
Inventory quantity must be an appropriate whole-number value for physical products.
Sellers can modify inventory only for their own products.
A seller cannot modify inventory belonging to another seller's product.
Inventory must maintain a valid relationship with Product.
Inventory changes must not create negative stock.

# Business Rules
Every active physical product must have an associated inventory record.
Sellers can update the stock of their own products.
Sellers cannot update another seller's inventory.
The Super Admin can manage inventory for Super Admin-owned products according to its product-management permissions.
When available quantity becomes zero, the product must be treated as out of stock.
An out-of-stock product must not be available for normal purchase.
Inventory must be checked before confirming an order.
Inventory must be updated when a successful order consumes stock.
Inventory must not become negative because of concurrent purchase requests.
Inventory changes should be handled atomically to prevent overselling.
Inventory should remain consistent with order processing.
Inventory history should be maintained separately through the Inventory History entity.
Deleting a product must not leave an unusable active inventory record.
Relationships

An Inventory:

Belongs to one Product.
Is associated with the seller through the Product.
Is referenced during cart and order processing.
Product
  │
  └─── 1 : 1 ─── Inventory
                    │
                    └─── Stock Availability