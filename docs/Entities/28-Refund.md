Refund Entity

 # Overview

The Refund entity represents money returned to a customer for a previously successful payment.

A Refund is generally created as a result of an approved return, cancellation, or another valid refund condition.

The Refund entity tracks the refund amount, reason, status, and payment-provider information required to complete and reconcile the refund.

# Purpose

Store refund information.
Associate refunds with the correct Order and Payment Transaction.
Track refund amounts.
Track refund status.
Support full and partial refunds.
Support payment-provider refund processing.
Provide a financial record for refund reconciliation.

# Owned By

Return & Refund Management

# Used By

Return & Refund Management
Order Management
Order Item Management
Payment Management
Payment Transaction Management
Customer Management
Seller Management
Settlement Management
Admin Dashboard
Reporting

# Attributes

Attribute	Description
Refund ID	Unique identifier for the refund
Order ID	Order associated with the refund
Order Item ID	Order Item associated with the refund, when applicable
Customer ID	Customer receiving the refund
Payment Transaction ID	Original payment transaction associated with the refund
Return Request ID	Return request that resulted in the refund, when applicable
Refund Amount	Amount being refunded
Currency	Currency of the refund
Refund Reason	Reason for the refund
Refund Status	Current status of the refund
Provider Refund ID	Payment provider's refund identifier
Processed At	Timestamp when the refund was successfully processed
Created At	Record creation timestamp
Updated At	Last modification timestamp
Refund Status

Possible statuses include:

Pending
Processing
Succeeded
Failed
Cancelled

A refund should be considered completed only after the required payment-provider confirmation has been received.

Refund Types

Possible refund scenarios include:

Full Refund
Partial Refund

A partial refund may be used when only part of an Order or Order Item is eligible for refund.

# Validation Rules

Every Refund must belong to a valid Order.
Every Refund must reference a valid Payment Transaction.
Every Refund must belong to the Customer associated with the Order.
Refund Amount must be greater than zero.
Refund Amount must not exceed the refundable amount of the original payment.
Currency must match the applicable payment currency.
Refund Status must contain a valid status.
Refund Reason is mandatory.
Provider Refund ID must be unique when provided.
A Refund must not be marked as successful without valid payment-provider confirmation.
A failed or cancelled refund must not be treated as successfully refunded.
Duplicate refund processing for the same refundable amount must be prevented.
Refunds associated with a Return Request must reference a valid Return Request.
The total refunded amount must never exceed the amount successfully paid by the customer.

# Business Rules

A Refund may be created after an approved cancellation, return, or other valid refund condition.
A customer cannot directly mark an Order as refunded.
Refund processing must be performed through authorized refund operations.
Refunds must reference the original successful Payment Transaction.
A full refund returns the eligible full amount.
A partial refund returns only the eligible portion of the original payment.
The total amount refunded for an Order must not exceed the amount actually paid.
Payment-provider confirmation is required before a Refund is marked as Succeeded.
Duplicate refund requests must not result in duplicate financial refunds.
A successful Refund must update the relevant Order and payment information according to the applicable workflow.
Refund information must remain traceable to the original Order, Order Item, Payment Transaction, and Return Request when applicable.
Refunds must not modify the historical price stored in the Order Item.
Refund records must remain available for financial reconciliation and reporting.
Sellers cannot directly modify or approve refund financial transactions.
The Super Admin can manage refunds according to marketplace administrative permissions.
Refund records must not be deleted in a way that breaks payment, order, return, or settlement history.
Relationships

A Refund:

Belongs to one Order.
References one Payment Transaction.
May reference one Order Item.
May reference one Return Request.
Belongs to one Customer.
Order
  │
  └─── 1 : Many ─── Refund
                         │
                         ├─── Many : 1 ─── Payment Transaction
                         │
                         ├─── Many : 1 ─── Order Item
                         │
                         ├─── Many : 1 ─── Return Request
                         │
                         └─── Many : 1 ─── Customer