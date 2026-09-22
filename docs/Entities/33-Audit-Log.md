Audit Log Entity

# Overview

The Audit Log entity records important actions and changes performed within the marketplace system.

It provides an immutable record of who performed an action, what action was performed, which resource was affected, and when the action occurred.

Audit Logs are used for security, accountability, troubleshooting, compliance, and administrative investigation.

# Purpose 

Record important system and user actions.
Track changes to sensitive marketplace data.
Identify who performed an operation.
Support security investigations.
Support administrative auditing.
Provide traceability for financial and marketplace operations.
Preserve historical activity records.

# Owned By

Audit & Security Management

# Used By 

Authentication
Authorization
User Management
Seller Management
Product Management
Order Management
Payment Management
Return & Refund Management
Settlement Management
Commission Management
Admin Dashboard
Security & Compliance 

# Attributes 

Attribute	Description
Audit Log ID	Unique identifier for the audit log
User ID	User who performed the action, when applicable
Action	Action that was performed
Resource Type	Type of resource affected
Resource ID	Identifier of the affected resource
Previous Value	Relevant value before the change, when applicable
New Value	Relevant value after the change, when applicable
IP Address	IP address from which the action was performed, when applicable
User Agent	Client or browser information, when applicable
Created At	Timestamp when the action occurred 

# Action Types

Possible actions include:

Create
Update
Delete
Approve
Reject
Login
Logout
Cancel
Refund
Settlement
Status Change
Permission Change

Additional action types may be introduced as new marketplace operations are added.

 # Validation Rules 

Every Audit Log must contain a valid action.
Resource Type is mandatory for resource-related actions.
Resource ID is mandatory for resource-related actions.
User ID must reference a valid User when the action is performed by an authenticated user.
Created At is mandatory.
Audit Log records must not be modified after creation.
Audit Log records must not be deleted through normal application operations.
Sensitive information such as passwords, authentication tokens, and payment credentials must not be stored in Audit Logs.
Audit Log creation must not allow unauthorized users to manipulate historical audit records. 

# Business Rules 

Important marketplace operations must generate an Audit Log.
Administrative actions must be auditable.
Sensitive operations such as seller approval, commission changes, refunds, settlements, and permission changes must be recorded.
The Audit Log must identify the user responsible for an action when applicable.
System-generated operations may use a system identity instead of a User ID.
Audit Logs must preserve the historical state required to understand important changes.
Audit Logs must be treated as immutable records.
Users must not be allowed to modify or delete their own Audit Logs.
Sellers and Customers must not have access to unrestricted Audit Logs.
The Super Admin can view Audit Logs according to administrative and security permissions.
Audit Logs must not expose sensitive credentials or secrets.
Audit Logs should remain available for security investigation, troubleshooting, and compliance requirements.
Relationships

An Audit Log:

May belong to one User who performed the action.
References one affected resource when applicable.
User
  │
  └─── 1 : Many ─── Audit Log
                         │
                         └─── References ─── User / Seller /
                                            Product / Order /
                                            Payment / Refund /
                                            Settlement / Other Resource