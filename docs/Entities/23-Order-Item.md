Order Item Entity
 # Overview

The Order Item entity represents a specific product purchased as part of an Order.

An Order can contain multiple Order Items, with each Order Item storing the product, quantity, and historical price information applicable when the order was created.

Order Item preserves the purchase snapshot so that future changes to the Product price, product information, or seller information do not affect historical order records.

# Purpose
Store individual products purchased within an Order.
Store the quantity purchased.
Preserve the product price at the time of purchase.
Associate the purchased product with its seller.
Support order fulfillment, returns, refunds, and settlements.
Preserve historical purchase information.

# Owned By

Order Management

# Used By 

Order Management
Product Management
Inventory Management
Seller Management
Payment Management
Shipping Management
Return & Refund Management
Settlement Management
Customer Management
Admin Dashboard

 # Attributes

Attribute	Description
Order Item ID	Unique identifier for the order item
Order ID	Order associated with the item
Product ID	Product purchased by the customer
Seller ID	Seller who owns the purchased product
Product Name Snapshot	Product name at the time of purchase
Unit Price	Product price per unit at the time of purchase
Quantity	Number of units purchased
Discount Amount	Discount applied to the order item
Tax Amount	Tax applied to the order item, when applicable
Subtotal	Total value of the item before applicable additional charges
Commission Rate	Commission percentage applicable when the order was created
Commission Amount	Commission amount calculated for the order item
Created At	Record creation timestamp
Updated At	Last modification timestamp
Price Snapshot

The Order Item must preserve the price information applicable when the order was created.

For example:

Product Current Price = ₹1,500
Order Item Unit Price = ₹1,200

If the seller later changes the product price to ₹1,500, the existing Order Item must continue to use:

Unit Price = ₹1,200

This ensures historical orders remain financially accurate.

 # Validation Rules

Every Order Item must belong to a valid Order.
Every Order Item must reference a valid Product.
Every Order Item must reference the applicable Seller.
Quantity must be greater than zero.
Unit Price cannot be negative.
Discount Amount cannot be negative.
Tax Amount cannot be negative.
Subtotal cannot be negative.
Commission Rate must be between 0% and 100%.
Commission Amount cannot be negative.
Historical unit price must be captured when the Order Item is created.
Historical commission information must be captured when required for settlement.
An Order Item cannot exist without an associated Order.
An Order Item must not be modified in a way that changes the historical financial meaning of a completed order.

# Business Rules

An Order must contain one or more Order Items.
Each Order Item represents one purchased Product.
A Product can appear in many different Order Items across different Orders.
Quantity represents the number of units purchased.
The Unit Price must represent the product price applicable at the time of purchase.
Changes to the current Product price must not modify the Unit Price of an existing Order Item.
The product name snapshot should preserve the product name applicable at the time of purchase.
The Seller associated with the Order Item must remain identifiable for settlement and reporting.
The applicable commission rate must be preserved for historical settlement calculations.
Commission for an existing Order Item must not be recalculated using a newer commission configuration.
Order Item information must remain available for fulfillment, returns, refunds, and settlement processing.
A customer can view Order Items belonging to their own Orders.
A seller can view Order Items associated with their own products.
Order Items must not be deleted in a way that breaks historical order, payment, refund, or settlement records.
Relationships

An Order Item:

Belongs to one Order.
References one Product.
Belongs to one Seller through the purchased Product.
May be associated with Shipment, Return, Refund, and Settlement records.
Order
  │
  └─── 1 : Many ─── Order Item
                         │
                         ├─── Many : 1 ─── Product
                         │
                         ├─── Many : 1 ─── Seller
                         │
                         ├─── 1 : Many ─── Return / Refund
                         │
                         └─── 1 : Many ─── Settlement