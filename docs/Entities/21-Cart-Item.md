Cart Item Entity
 # Overview

The Cart Item entity represents a specific product and quantity stored inside a customer's Cart.

A Cart contains multiple Cart Items, and each Cart Item references one Product.

 # Purpose
Store products added to a customer's Cart.
Store the quantity of each product in the Cart.
Associate products with the correct Cart.
Support adding, updating, and removing products from the Cart.
Provide the items required during the checkout process.

# Owned By

Shopping Management

 # Used By
Cart Management
Product Management
Inventory Management
Customer Management
Order Management
Checkout
Customer Marketplace

 # Attributes
Attribute	Description
Cart Item ID	Unique identifier for the cart item
Cart ID	Cart associated with the item
Product ID	Product added to the cart
Quantity	Number of units of the product in the cart
Created At	Record creation timestamp
Updated At	Last modification timestamp

# Validation Rules
Every Cart Item must belong to a valid Cart.
Every Cart Item must reference a valid Product.
Quantity is mandatory.
Quantity must be greater than zero.
A customer can add Cart Items only to their own Cart.
A Cart Item cannot reference a deleted or invalid Product.
A Cart Item must not create duplicate entries for the same Product within the same Cart.
Cart Item operations must respect the available inventory.
A Cart Item cannot be modified after its Cart has been converted into an Order.

 # Business Rules
A Cart can contain multiple Cart Items.
Each Cart Item represents one Product.
A Product can appear in multiple customers' Carts.
If a customer adds the same Product again, the existing Cart Item quantity should be updated rather than creating another Cart Item.
A customer can increase or decrease the quantity of their Cart Item.
A customer can remove a Cart Item from their own Cart.
A customer cannot modify another customer's Cart Item.
The quantity requested by the customer must not exceed the available inventory at checkout.
Product availability and price must be revalidated during checkout.
Cart Item data represents an intended purchase and does not represent a confirmed purchase.
The final purchased quantity and price must be stored in the Order Item when the order is created.
Removing a Cart Item does not modify or delete the Product.
Cart Items belonging to a converted Cart must not be treated as active shopping items.
Relationships

A Cart Item:

Belongs to one Cart.
References one Product.
Cart
  │
  └─── 1 : Many ─── Cart Item ─── Many : 1 ─── Product