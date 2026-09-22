Activity Log Entity 

# Overview

The Activity Log entity records general activities performed by users within the marketplace.

It is mainly used to track user activity and system events for monitoring, troubleshooting, analytics, and operational visibility.

Unlike the Audit Log, which focuses on security-sensitive and data-changing actions, the Activity Log focuses on general user and system activity.

# Purpose 

Track user activities within the marketplace.
Record important system activities.
Support activity monitoring.
Support troubleshooting and operational analysis.
Provide activity history for users and administrators.
Support future analytics and reporting. 

# Owned By

Activity & Monitoring Management

# Used By 

Customer Management
Seller Management
Authentication
Order Management
Product Management
Admin Dashboard
Notification Management
Activity Monitoring
Reporting & Analytics 

# Attributes 

Attribute	Description
Activity Log ID	Unique identifier for the activity log
User ID	User who performed the activity, when applicable
Activity Type	Type of activity performed
Description	Description of the activity
Resource Type	Type of resource associated with the activity, when applicable
Resource ID	Identifier of the associated resource, when applicable
IP Address	IP address from which the activity occurred, when applicable
User Agent	Client or browser information, when applicable
Created At	Timestamp when the activity occurred

# Activity Types

Possible activity types include:

Login
Logout
Product Viewed
Product Searched
Cart Updated
Checkout Started
Order Viewed
Order Created
Profile Updated
Address Updated
Seller Dashboard Accessed
Admin Dashboard Accessed

Additional activity types may be introduced as marketplace features are added.

# Validation Rules 

Activity Type is mandatory.
Description is mandatory.
User ID must reference a valid User when the activity is performed by an authenticated user.
Resource Type and Resource ID must be valid when the activity is associated with a specific resource.
Created At is mandatory.
Activity Log records should not contain sensitive credentials, passwords, authentication tokens, or payment credentials.
Activity records should not be modified after creation.
Users must not be allowed to manipulate their own Activity Logs.

# Business Rules 

Important user and system activities may generate Activity Log records.
Activity Logs should identify the User responsible for the activity when applicable.
System-generated activities may use a system identity when no specific user is responsible.
Activity Logs may reference the resource involved in the activity.
Activity Logs are primarily used for monitoring, troubleshooting, analytics, and operational visibility.
Activity Logs should not be treated as the authoritative financial or security audit record.
Security-sensitive and data-changing operations should also be recorded in the Audit Log where required.
Customers can view only activity information exposed to them by the application.
Sellers can view only activity information permitted by marketplace rules.
The Super Admin can access activity information according to administrative permissions.
Activity Logs should be retained according to the system's data-retention requirements.
Activity logging must not cause the underlying marketplace operation to fail unless explicitly required by the system.
Relationships

An Activity Log:

May belong to one User.
May reference one related resource.
User
  │
  └─── 1 : Many ─── Activity Log
                         │
                         └─── May reference ─── Product / Cart /
                                               Order / Profile /
                                               Address / Other Resource