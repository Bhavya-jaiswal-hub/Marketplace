Customer Profile Entity


 # Overview

The Customer Profile entity stores the profile information of a customer who uses the marketplace.

A customer can browse products without logging in, but a Customer Profile is created when a user has a customer account and performs authenticated customer operations.

# Purpose
Store customer profile information.
Associate customer information with the corresponding user account.
Support customer-specific marketplace operations.
Provide customer information required for orders and other customer services.

 # Owned By

Customer Management

 # Used By
Authentication
Customer Management
Shopping Management
Order Management
Payment Management
Return & Refund Management
Notification Management
Admin Dashboard 

 # Attributes

Attribute	Description
Customer Profile ID	Unique identifier for the customer profile
User ID	User account associated with the customer
First Name	Customer's first name
Last Name	Customer's last name
Phone Number	Customer's contact number
Created At	Record creation timestamp
Updated At	Last modification timestamp

 # Validation Rules
Every Customer Profile must belong to a valid User.
User ID is mandatory.
A User should have only one Customer Profile.
Customer profile information must follow the configured validation rules.
Phone Number must follow the configured phone number format.
A customer cannot create multiple customer profiles for the same User account.
Customer Profile must not reference an invalid or deleted User.

 # Business Rules
A Customer Profile belongs to one User account.
A customer can browse marketplace products without creating or using a Customer Profile.
Authenticated customer operations require a valid customer account.
Customers can manage their own profile information.
A customer cannot modify another customer's profile.
Customer profile information may be used during order and customer-related operations.
Customer profile deletion must not break historical orders or financial records.
Historical customer-related records must remain traceable after profile changes.
The Super Admin may view customer information according to marketplace administrative permissions.
Relationships

A Customer Profile:

Belongs to one User.
Can have multiple Addresses.
Can be associated with multiple Orders.
User
  │
  └─── 1 : 1 ─── Customer Profile
                      │
                      ├─── 1 : Many ─── Address
                      │
                      └─── 1 : Many ─── Order