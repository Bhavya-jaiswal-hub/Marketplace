Payment Pending Entity

# Overview

The Payment Pending entity stores payment information for a payment attempt that has been initiated but has not yet reached a final payment state.

It allows the system to track payments that are awaiting confirmation from the payment provider before the order payment is marked as successful or failed.

 # Purpose 

Track pending payment attempts.
Associate a payment attempt with the correct Order.
Store the payment provider reference.
Support payment confirmation and reconciliation.
Prevent an unconfirmed payment from being treated as a successful payment.

# Owned By

Payment Management

# Used By

Payment Management
Order Management
Checkout
Customer Management
Notification Management
Admin Dashboard
Settlement Management

 # Attributes

Attribute	Description
Payment Pending ID	Unique identifier for the pending payment record
Order ID	Order associated with the payment
Customer ID	Customer who initiated the payment
Payment Reference	Internal payment reference
Provider Reference	Payment provider's transaction or payment identifier
Amount	Amount expected to be paid
Currency	Currency of the payment
Payment Method	Payment method used for the payment attempt
Payment Status	Current status of the payment attempt
Expires At	Timestamp after which the pending payment is no longer valid
Created At	Record creation timestamp
Updated At	Last modification timestamp

# Payment Status

Possible statuses include:

Pending
Processing
Succeeded
Failed
Expired
Cancelled

A payment should be considered successful only after the required payment confirmation has been received and validated.

# Validation Rules

Every Payment Pending record must belong to a valid Order.
Every Payment Pending record must belong to a valid Customer.
Payment Reference must be unique.
Provider Reference must be valid when provided by the payment provider.
Amount must be greater than zero.
Currency is mandatory.
Payment Status must contain a valid status.
A pending payment must not be treated as successful without payment confirmation.
An expired or cancelled payment must not be processed as a successful payment.
Payment amount must match the applicable Order amount according to the payment workflow.
A customer can initiate payment only for their own Order.

# Business Rules

A Payment Pending record is created when a payment attempt has been initiated but is not yet confirmed.
Pending payment does not mean that the customer has successfully paid.
The Order must not be treated as paid until the payment is successfully confirmed.
Payment confirmation must be validated before changing the payment to Succeeded.
Failed payments must not be treated as successful payments.
Expired payments must not be used to complete the original payment attempt.
A customer cannot modify payment status manually.
Payment status changes must be controlled by authorized payment-processing operations.
Payment provider callbacks or webhooks must be validated before updating payment status.
Duplicate payment confirmations must not create duplicate successful payments.
Payment information must remain traceable to the related Order.
Successful payment information must be preserved for order, refund, and settlement processing.
Historical payment records must not be deleted in a way that breaks financial reconciliation.
Relationships

A Payment Pending:

Belongs to one Order.
Belongs to one Customer.
May be associated with a Payment record after successful or final payment processing.
Order
  │
  └─── 1 : Many ─── Payment Pending
                         │
                         └─── May become ─── Payment