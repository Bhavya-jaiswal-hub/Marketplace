Order Item History Entity
# Overview

The Order Item History entity records important changes made to an Order Item throughout its lifecycle.

It provides a historical record of changes related to quantity, status, fulfillment, cancellation, return, refund, or other order-item-level operations.

Order Item History is maintained separately from the Order Item entity because the Order Item stores the current state, while Order Item History preserves the historical changes.

 # Purpose
Maintain a history of Order Item changes.
Track important order-item-level state changes.
Support order auditing and troubleshooting.
Provide traceability for cancellations, returns, and refunds.
Support seller, customer, and admin order history.
Preserve historical information for completed orders.

 # Owned By

Order Management

 # Used By

Order Management
Seller Management
Customer Management
Inventory Management
Shipping Management
Return & Refund Management
Settlement Management
Admin Dashboard
Reporting

 # Attributes 

Attribute	Description
Order Item History ID	Unique identifier for the history record
Order Item ID	Order Item associated with the history record
Order ID	Order associated with the Order Item
Previous Status	Status of the Order Item before the change
New Status	Status of the Order Item after the change
Quantity	Quantity associated with the Order Item at the time of the event
Event Type	Type of change or event that occurred
Reason	Reason for the change, when applicable
Reference ID	Identifier of the related order, return, refund, shipment, or other operation
Changed By	User or system responsible for the change
Created At	Timestamp when the history record was created
Event Types

Possible event types include:

Created
Status Changed
Quantity Changed
Cancelled
Shipped
Delivered
Returned
Refunded
Partially Refunded
Inventory Adjusted

Additional event types may be introduced when required by future order workflows.

# Validation Rules 

Every Order Item History record must belong to a valid Order Item.
Every Order Item History record must reference a valid Order.
Event Type is mandatory.
Created At is mandatory.
Previous Status must be valid when applicable.
New Status must be valid when applicable.
Quantity must not be negative.
Reference ID must be valid when the event is associated with another business operation.
Changed By must identify a valid user or system operation when applicable.
History records must not be modified after creation.
History records must not be created for unauthorized Order Item operations.

# Business Rules

Important changes to an Order Item must create an Order Item History record.
Order Item History must preserve the sequence of important Order Item events.
Status changes must record the previous and new status when applicable.
Cancellation events must record the reason when required.
Return and refund events must be traceable through the relevant reference information.
Inventory-related changes should be traceable to the corresponding Order Item operation.
Sellers can view history only for Order Items associated with their own products.
Customers can view history related to their own Orders according to marketplace rules.
The Super Admin can view Order Item History according to administrative permissions.
Order Item History must be treated as an audit trail.
Historical records must not be deleted in a way that breaks order, refund, return, inventory, or settlement traceability.
The current Order Item state must be obtained from the Order Item entity rather than reconstructed solely from the history records.
Relationships

An Order Item History:

Belongs to one Order Item.
Belongs to one Order.
May reference a Return, Refund, Shipment, or Inventory operation.
Order Item
  │
  └─── 1 : Many ─── Order Item History
                         │
                         ├─── May reference ─── Return
                         ├─── May reference ─── Refund
                         ├─── May reference ─── Shipment
                         └─── May reference ─── Inventory Operation