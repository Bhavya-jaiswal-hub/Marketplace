Order Entity

# Overview

The Order entity represents a confirmed purchase made by a customer on the marketplace.

An Order is created after the customer completes the checkout process and the system successfully validates the required product, inventory, pricing, customer, and payment information.

An Order preserves the important information about the purchase so that future changes to the Product, price, commission, or inventory do not change the historical order.

 # Purpose
Store confirmed customer purchases.
Associate purchases with the correct customer.
Track the overall order status.
Store the financial snapshot of the order.
Support payment, fulfillment, shipping, return, refund, and settlement workflows.
Preserve historical purchase information.
Provide a central reference for all order-related operations.
 # Owned By

Order Management

# Used By
Customer Management
Product Management
Inventory Management
Shopping Management
Checkout
Payment Management
Shipping Management
Return & Refund Management
Settlement Management
Notification Management
Seller Management
Admin Dashboard
 # Attributes
Attribute	Description
Order ID	Unique identifier for the order
Customer ID	Customer who placed the order
Order Number	Human-readable unique order reference
Shipping Address ID	Address associated with the order shipment
Order Status	Current overall status of the order
Payment Status	Current payment status of the order
Subtotal	Total product value before additional charges
Shipping Amount	Shipping charges applied to the order
Discount Amount	Total discount applied to the order
Tax Amount	Tax amount applied to the order, when applicable
Total Amount	Final amount payable by the customer
Created At	Order creation timestamp
Updated At	Last modification timestamp

# Order Status

Possible statuses include:

Pending
Confirmed
Processing
Shipped
Delivered
Cancelled
Returned
Refunded

The exact status transitions depend on the final order, shipping, cancellation, return, and refund workflows.

Payment Status

Possible payment statuses include:

Pending
Paid
Failed
Partially Refunded
Refunded

Payment status is maintained separately from Order Status because an order's fulfillment lifecycle and payment lifecycle can progress independently.

# Validation Rules
Every Order must belong to a valid Customer.
Order Number must be unique.
Order must contain at least one Order Item.
Total Amount cannot be negative.
Subtotal cannot be negative.
Shipping Amount cannot be negative.
Discount Amount cannot be negative.
Tax Amount cannot be negative.
Order Status must contain a valid status.
Payment Status must contain a valid status.
Product availability and inventory must be validated before order confirmation.
The final product price must be captured when the Order is created.
The applicable commission must be captured as part of the order's financial snapshot.
Historical order information must not depend on the current Product price or current commission configuration.
A customer can access only their own orders.
A seller can access order information relevant to their own products.
An Order cannot be confirmed without successful completion of the required checkout and payment conditions.

# Business Rules
An Order is created from the customer's Cart during checkout.
An Order can contain multiple Order Items.
The customer must have sufficient product availability before the order is confirmed.
Inventory must be updated as part of successful order processing.
The price stored in the Order represents the price applicable when the order was created.
Future changes to the Product price must not change an existing Order.
The commission applicable when the order was created must be preserved in the order's financial information.
Future commission changes must not recalculate historical orders.
An Order must preserve the relevant customer, product, price, commission, and financial information required for historical accuracy.
Order status changes must follow the defined order lifecycle.
Payment status must be tracked independently from Order Status.
A customer can view their own orders and order details.
A customer cannot modify another customer's order.
Sellers can view and manage orders containing their own products according to their marketplace permissions.
The Super Admin can view and manage marketplace orders according to administrative permissions.
Order cancellation, return, and refund operations must follow the applicable marketplace business rules.
Historical orders must not be deleted in a way that breaks financial, settlement, refund, or reporting records.
Order information must remain available for settlement and reporting after the order lifecycle is completed.
Relationships

An Order:

Belongs to one Customer.
Contains one or more Order Items.
Is associated with a Shipping Address.
Is associated with Payment information.
May have Shipment information.
May have Return and Refund records.
May contribute to Seller Settlement records.
Customer
  │
  └─── 1 : Many ─── Order
                       │
                       ├─── 1 : Many ─── Order Item
                       │
                       ├─── Many : 1 ─── Shipping Address
                       │
                       ├─── 1 : Many ─── Payment
                       │
                       ├─── 1 : Many ─── Shipment
                       │
                       ├─── 1 : Many ─── Return / Refund
                       │
                       └─── 1 : Many ─── Seller Settlement