Inventory History Entity

 # Overview

The Inventory History entity records changes made to the inventory of a Product.

It provides a historical record of stock movements so that inventory changes can be traced and reviewed.

Inventory History is separate from the Inventory entity because Inventory stores the current stock state, while Inventory History stores the historical changes to that stock.

 # Purpose
Maintain a history of inventory changes.
Track increases and decreases in stock.
Identify the reason for inventory changes.
Support inventory auditing.
Help investigate inventory discrepancies.
Support reporting and administrative review.

# Owned By

Inventory Management

 # Used By
Inventory Management
Product Management
Seller Management
Order Management
Admin Dashboard
Reporting
Audit Management

# Attributes
Attribute	Description
Inventory History ID	Unique identifier for the inventory history record
Inventory ID	Inventory record associated with the change
Product ID	Product whose inventory was changed
Change Type	Type of inventory change
Quantity Change	Quantity added or removed
Previous Quantity	Stock quantity before the change
New Quantity	Stock quantity after the change
Reason	Reason for the inventory change
Reference ID	Related order or operation identifier, when applicable
Created At	Timestamp when the inventory change was recorded
Change Types

Possible inventory change types include:

Stock Added
Stock Removed
Order Deduction
Order Cancellation
Return
Manual Adjustment

Additional change types may be introduced when required by future inventory workflows.

# Validation Rules 

Every Inventory History record must belong to a valid Inventory.
Every Inventory History record must reference a valid Product.
Change Type is mandatory.
Quantity Change is mandatory.
Quantity Change must be a valid quantity value.
Previous Quantity cannot be negative.
New Quantity cannot be negative.
New Quantity must correctly reflect the recorded inventory change.
Reason is mandatory for manual inventory adjustments.
Reference ID must be valid when the change is associated with an order or another business operation.
Inventory History records should not be modified after creation.

# Business Rules
Every significant inventory change must create an Inventory History record.
Inventory History must preserve the previous and resulting stock quantities.
Order-related inventory deductions must be traceable to the relevant order.
Order cancellation or product return may create an inventory increase when the product is returned to available stock.
Manual stock adjustments must record the reason for the adjustment.
Sellers can view inventory history only for their own products.
A seller cannot modify or delete inventory history belonging to another seller.
Inventory History should be treated as an audit trail and should not be used as the current source of inventory quantity.
Current stock must always be obtained from the Inventory entity.
Historical inventory records must remain available for reporting and investigation.
Inventory History records should not be deleted in a way that breaks the audit trail.
Relationships

An Inventory History:

Belongs to one Inventory.
References one Product.
May reference an Order or another business operation when applicable.
Inventory
  │
  └─── 1 : Many ─── Inventory History
                         │
                         └─── Many : 1 ─── Product