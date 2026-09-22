Address Pending Entity 

# Overview

The Address Pending entity stores address information that is temporarily pending verification or approval before it becomes an active address.

It allows the system to keep the submitted address separate from the currently verified address until the required verification process is completed.

 # Purpose
Store newly submitted or modified address information that is pending verification.
Prevent unverified address information from immediately replacing verified address information.
Support address verification workflows.
Maintain the submitted address information until verification is completed.

# Owned By

Customer Management

# Used By 

Customer Management
Address Management
Order Management
Address Verification
Admin Dashboard

# Attributes

Attribute	Description
Address Pending ID	Unique identifier for the pending address record
Customer ID	Customer associated with the pending address
Address Type	Type of address being submitted
Address Line 1	Primary address information
Address Line 2	Additional address information
City	Customer's city
State	Customer's state
Postal Code	Customer's postal code
Country	Customer's country
Verification Status	Current verification status of the address
Created At	Record creation timestamp
Updated At	Last modification timestamp
Verification Status

Possible statuses include:

Pending
Approved
Rejected

An address should become an active customer address only after the required verification process is successfully completed.

# Validation Rules 

Every pending address must belong to a valid Customer.
Address Line 1 is mandatory.
City is mandatory.
State is mandatory.
Postal Code is mandatory.
Country is mandatory.
Postal Code must follow the configured country format.
Verification Status must contain a valid status.
A customer cannot submit an invalid address.
A customer cannot access or modify another customer's pending address.
Only authorized verification operations can approve or reject a pending address.

# Business Rules

A newly submitted address may remain pending until verification is completed.
A pending address must not automatically replace the customer's currently active address.
A customer can submit or update their own address.
A customer cannot modify another customer's pending address.
An approved pending address can become an active customer address.
A rejected pending address must not become an active address.
Address changes that require verification must go through the pending address workflow.
The system should preserve the submitted address information while verification is pending.
Pending address information must remain associated with the correct customer.
The Super Admin may review pending addresses according to administrative permissions.
Relationships

An Address Pending:

Belongs to one Customer.
May become an active Address after successful verification.
Customer
  │
  └─── 1 : Many ─── Address Pending
                         │
                         └─── Approved ─── Address