Cart Entity

# Overview

The Cart entity represents the shopping cart associated with a customer.

A cart stores the products that a customer intends to purchase before the order is created.

A customer can add, update, or remove products from their cart before checkout.

# Purpose
Maintain the customer's shopping cart.
Associate a cart with a customer.
Provide a container for cart items.
Support adding products to the cart.
Support updating product quantities.
Support removing products from the cart.
Support the checkout process.

# Owned By

Shopping Management

# Used By

Customer Management
Product Management
Inventory Management
Shopping Management
Order Management
Payment Management
Customer Marketplace

# Attributes 

Attribute	Description
Cart ID	Unique identifier for the cart
Customer ID	Customer associated with the cart
Status	Current status of the cart
Created At	Record creation timestamp
Updated At	Last modification timestamp
Cart Status

Possible statuses include:

Active
Converted
Abandoned

An Active cart can be modified by the customer.

A Converted cart represents a cart whose contents have been successfully processed into an order.

An Abandoned cart represents a cart that is no longer actively being used.

# Validation Rules

Every Cart must belong to a valid Customer.
A customer should have only one active Cart.
Cart status must contain a valid status.
Only valid products can be added to a Cart.
A customer can modify only their own Cart.
Cart quantity must be a positive value.
A product must have sufficient available inventory before it can be added or its quantity increased.
Cart operations must not create negative inventory.
A Cart cannot be modified after it has been converted into an Order.

# Business Rules

A Cart belongs to one Customer.
A Customer can add multiple products to their Cart.
A Cart can contain multiple Cart Items.
A customer can add, update, or remove products from their own Cart.
A customer cannot access or modify another customer's Cart.
Adding the same product again should update the existing Cart Item quantity instead of creating an unnecessary duplicate Cart Item, unless product variants require separate cart entries.
Cart contents do not represent a confirmed purchase.
Product price and inventory may change while a product is present in the Cart.
Final product price and inventory availability must be validated again during checkout.
A successful checkout converts the relevant cart contents into an Order.
A converted Cart must not be modified as an active shopping cart.
Removing an item from the Cart does not affect the Product itself.
Cart data should not be used as the source of truth for historical order information.
Relationships

A Cart:

Belongs to one Customer.
Contains multiple Cart Items.
Customer
  │
  └─── 1 : 1 ─── Cart
                   │
                   └─── 1 : Many ─── Cart Item