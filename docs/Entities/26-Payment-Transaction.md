Payment Transaction Entity

# Overview

The Payment Transaction entity represents a finalized financial transaction associated with an Order.

It stores the payment information required to confirm that money was successfully received from the customer and provides a reliable financial record for reconciliation, refunds, and settlement processing.

# Purpose

Store finalized payment transaction information.
Associate a payment transaction with the correct Order.
Record the amount actually processed.
Store the payment provider transaction reference.
Support payment reconciliation.
Support refunds and settlement processing.
Maintain historical financial records.

# Owned By

Payment Management

# Used By

Payment Management
Order Management
Customer Management
Checkout
Return & Refund Management
Settlement Management
Admin Dashboard
Reporting

# Attributes

Attribute	Description
Payment Transaction ID	Unique identifier for the payment transaction
Order ID	Order associated with the transaction
Customer ID	Customer who made the payment
Payment Reference	Internal payment reference
Provider Transaction ID	Payment provider's transaction identifier
Amount	Amount successfully processed
Currency	Currency used for the transaction
Payment Method	Payment method used by the customer
Transaction Status	Current status of the transaction
Transaction Type	Type of financial transaction
Processed At	Timestamp when the transaction was processed
Created At	Record creation timestamp
Updated At	Last modification timestamp

# Transaction Status


Possible statuses include:

Pending
Succeeded
Failed
Cancelled
Refunded
Partially Refunded

A transaction should be considered financially successful only when the payment provider has confirmed successful processing.

Transaction Types

Possible transaction types include:

Payment
Refund
Partial Refund

The exact transaction model may be extended if additional payment-provider operations are introduced in the future.

# Validation Rules

Every Payment Transaction must belong to a valid Order.
Every Payment Transaction must belong to a valid Customer.
Payment Reference must be unique.
Provider Transaction ID must be unique when provided by the payment provider.
Amount must be greater than zero for successful payment transactions.
Currency is mandatory.
Transaction Status must contain a valid status.
Transaction Type must contain a valid transaction type.
A transaction cannot be marked as successful without valid payment-provider confirmation.
Duplicate successful transactions for the same payment attempt must be prevented.
Refund amounts must not exceed the successfully paid amount.
A customer can create payment transactions only for their own Order through the authorized payment workflow.

# Business Rules

A Payment Transaction is created or finalized when a payment attempt receives a valid payment-provider result.
A successful Payment Transaction must be associated with the relevant Order.
The payment amount must correspond to the amount required by the Order payment workflow.
A successful payment must update the relevant Order Payment Status.
Failed transactions must not mark the Order as paid.
Duplicate payment-provider callbacks must not create duplicate successful transactions.
Payment-provider webhooks must be validated before updating transaction information.
Payment Transaction records must remain available for financial reconciliation.
Refunds must reference the original successful payment transaction.
Partial refunds must not exceed the remaining refundable amount.
Payment Transaction information must remain consistent with the related Order and refund records.
Historical payment transactions must not be deleted in a way that breaks financial reconciliation, refund, or settlement records.
Customers can view payment information associated with their own Orders according to marketplace rules.
Sellers must not be allowed to modify payment transaction records.
The Super Admin can view payment transaction information according to administrative permissions.
Relationships

A Payment Transaction:

Belongs to one Order.
Belongs to one Customer.
May be associated with Refund records.
May be referenced during Settlement processing.
Order
  │
  └─── 1 : Many ─── Payment Transaction
                         │
                         ├─── 1 : Many ─── Refund
                         │
                         └─── Referenced By ─── Settlement