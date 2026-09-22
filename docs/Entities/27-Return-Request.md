Return Request Entity

# Overview

The Return Request entity represents a request submitted by a customer to return a purchased product from an Order.

A Return Request is associated with a specific Order Item and tracks the customer's return request through the return approval and processing lifecycle.

# Purpose 

Store customer return requests.
Associate a return request with the correct Order and Order Item.
Store the reason for the return.
Track the return request status.
Support return approval and processing.
Support refund processing after a valid return.

# Owned By

Return & Refund Management

# Used By 

Customer Management
Order Management
Order Item Management
Return & Refund Management
Inventory Management
Payment Management
Seller Management
Settlement Management
Admin Dashboard

# Attributes

Attribute	Description
Return Request ID	Unique identifier for the return request
Order ID	Order associated with the return
Order Item ID	Order Item being returned
Customer ID	Customer who requested the return
Return Reason	Reason provided by the customer
Return Quantity	Number of units requested for return
Customer Comments	Additional information provided by the customer
Status	Current status of the return request
Requested At	Timestamp when the return was requested
Reviewed At	Timestamp when the return request was reviewed
Created At	Record creation timestamp
Updated At	Last modification timestamp
Return Request Status

Possible statuses include:

Pending
Approved
Rejected
Pickup Scheduled
Received
Completed
Cancelled

The exact status transitions depend on the final return and shipping workflow.

# Validation Rules

Every Return Request must belong to a valid Order.
Every Return Request must reference a valid Order Item.
Every Return Request must belong to the Customer who placed the Order.
Return Quantity must be greater than zero.
Return Quantity must not exceed the quantity eligible for return.
Return Reason is mandatory.
Return Request Status must contain a valid status.
A customer can request a return only for their own Order Items.
A customer cannot request a return for an Order Item that is not eligible for return.
A completed, cancelled, or already fully returned Order Item must not accept another return request.
Return requests must follow the configured return window and eligibility rules.
A return request cannot be approved without satisfying the applicable marketplace return conditions.

# Business Rules

A customer can create a Return Request for an eligible Order Item.
A customer cannot create a return request for another customer's Order Item.
Return eligibility depends on the marketplace's return policy.
The return request must specify a valid return reason.
A customer may return only the eligible quantity of an Order Item.
A return request must be reviewed before the return is processed when approval is required.
An approved return may proceed to pickup or return shipment.
A rejected return request must not proceed to refund processing.
A completed return may trigger the applicable refund process.
Returned inventory may be added back to available inventory only when the returned product is accepted according to inventory rules.
A return request must remain associated with the original Order and Order Item.
Return information must not modify the historical price of the original Order Item.
Customers can view and manage only their own return requests.
Sellers can view return requests related to their own products according to marketplace permissions.
The Super Admin can review and manage return requests according to administrative permissions.
Return Request records must not be deleted in a way that breaks order, refund, inventory, or settlement history.
Relationships

A Return Request:

Belongs to one Order.
References one Order Item.
Belongs to one Customer.
May result in one or more Refund records.
May result in an Inventory update after the returned product is accepted.
Order
  │
  └─── 1 : Many ─── Return Request
                         │
                         ├─── Many : 1 ─── Order Item
                         │
                         ├─── Many : 1 ─── Customer
                         │
                         ├─── 1 : Many ─── Refund
                         │
                         └─── May Update ─── Inventory