Settlement Entity

# Overview

The Settlement entity represents the financial settlement of money owed to a seller by the marketplace.

A settlement is created after considering the seller's eligible order amounts, marketplace commission, refunds, returns, and other applicable financial adjustments.

It provides the financial record used to determine how much money should be paid to a seller.

# Purpose 

Calculate and record seller settlement amounts.
Track money owed to sellers.
Account for marketplace commission.
Account for refunds and other applicable adjustments.
Track settlement status.
Support seller payouts.
Provide financial records for reconciliation and reporting.

# Owned By

Settlement Management

# Used By 

Settlement Management
Seller Management
Order Management
Order Item Management
Payment Management
Return & Refund Management
Commission Management
Admin Dashboard
Reporting

# Attributes 

Attribute	Description
Settlement ID	Unique identifier for the settlement
Seller ID	Seller receiving the settlement
Settlement Period From	Start of the settlement period
Settlement Period To	End of the settlement period
Gross Amount	Total eligible order amount before deductions
Commission Amount	Marketplace commission deducted from the seller
Refund Amount	Refund amount deducted from the settlement
Adjustment Amount	Other applicable financial adjustments
Net Settlement Amount	Final amount payable to the seller
Currency	Currency used for the settlement
Settlement Status	Current status of the settlement
Processed At	Timestamp when the settlement was processed
Created At	Record creation timestamp
Updated At	Last modification timestamp 

# Settlement Status

Possible statuses include:

Pending
Processing
Completed
Failed
Cancelled

A settlement should be considered completed only after the applicable seller payout has been successfully processed.

# Validation Rules  

Every Settlement must belong to a valid Seller.
Settlement Period From must be earlier than Settlement Period To.
Gross Amount cannot be negative.
Commission Amount cannot be negative.
Refund Amount cannot be negative.
Adjustment Amount cannot be negative unless negative adjustments are explicitly supported by the settlement model.
Net Settlement Amount cannot be negative unless the marketplace explicitly supports negative seller balances.
Settlement Status must contain a valid status.
Currency is mandatory.
An Order Item must not be included multiple times in the same settlement.
Only eligible Order Items can be included in a settlement.
Commission calculations must use the commission applicable to the relevant Order.
A completed settlement must not be modified in a way that changes its historical financial meaning.
A seller cannot modify their own settlement records.

# Business Rules 

Settlements are calculated for a specific Seller and settlement period.
Only eligible completed or otherwise settlement-eligible Order Items should contribute to a settlement.
Marketplace commission must be deducted according to the commission applicable when the relevant Order was created.
A newer commission configuration must not recalculate historical orders.
Refunds and applicable return-related adjustments must be reflected in the seller's settlement.
The seller receives the applicable net settlement amount after commission, refunds, and other valid deductions.
An Order Item must not be settled more than once for the same settlement component.
Settlement calculations must remain traceable to the underlying Order Items.
Sellers cannot manually modify settlement amounts.
The Super Admin can review and manage settlement operations according to administrative permissions.
Settlement records must remain available for financial reconciliation and reporting.
Completed settlements must not be deleted or modified in a way that breaks historical financial records.
Failed settlements may be retried according to the settlement and payout workflow.
Settlement completion must occur only after the applicable payout process has been successfully completed.
Relationships

A Settlement:

Belongs to one Seller.
Contains financial information derived from multiple Order Items.
May include deductions from Refunds.
Uses Commission information applicable to the relevant Orders.
May result in a Seller Payout.
Seller
  │
  └─── 1 : Many ─── Settlement
                         │
                         ├─── Many : Many ─── Order Item
                         │
                         ├─── May include ─── Refund
                         │
                         ├─── Uses ─── Commission
                         │
                         └─── May result in ─── Seller Payout