Yes. This entities/README.md should act as the index and context map for the entire database entity documentation. It will help us stay synchronized as we continue and prevent us from accidentally changing the entity list, numbering, domain ownership, or requirements.

Based on your current database-design.md and the 12 entity files you've already created, use the following as your complete entities/README.md.

# Database Entities

## 1. Purpose

This directory contains the detailed database entity specifications for the Multi-Vendor Marketplace.

Each entity has its own Markdown file containing the complete specification for that entity.

The entity files are derived from:

1. Business Workflows
2. Software Requirements Specification (SRS)
3. Software Architecture
4. High-Level Database Design

These entity files serve as the detailed database-level source of truth for backend implementation, API development, data validation, relationships, and business rules.

---

## 2. Database Entity Documentation Structure

Each entity must have its own Markdown file.

Example:

```text
entities/
├── 01-User.md
├── 02-Role.md
├── 03-Session.md
└── ...

The numbering is used to maintain a stable and predictable order.

The entity number should not be changed casually after implementation begins because other documentation may reference the entity by its number.

3. Entity Documentation Standard

Every entity file should contain the relevant sections required to completely describe that entity.

The standard structure is:

Overview
Purpose
Owned By
Used By
Attributes
Status / Types
Validation Rules
Business Rules
Lifecycle
Relationships
Security Considerations
Audit Requirements
Future Enhancements
Notes

Additional sections may be added when an entity requires specialized rules.

For example:

Financial Rules
Approval Rules
Inventory Rules
Order Rules
Settlement Rules
Security Rules
State Transition Rules

The goal is that each entity file should be understandable independently without requiring the developer to search through multiple documents to understand the entity's core behavior.

4. Entity Status

The status values used in this README describe the documentation progress.

Completed

The entity specification has been reviewed and documented.

Pending

The entity has been identified but its detailed specification has not yet been completed.

Needs Review

The entity has been documented but requires clarification, consistency checking, or confirmation against the client requirements.

Finalized

The entity has been fully reviewed and approved for implementation.

5. Identity & Access Management

Responsible for managing platform users, roles, sessions, and authentication-related information.

#	Entity	File	Status
01	User	01-User.md	Completed
02	Role	02-Role.md	Completed
03	Session	03-Session.md	Completed
04	Refresh Token	04-Refresh-Token.md	Completed
05	Password Reset Token	05-Password-Reset-Token.md	Completed
6. Seller Management

Responsible for seller onboarding, seller verification, verification documents, and seller address information.

#	Entity	File	Status
06	Seller Profile	06-Seller-Profile.md	Completed
07	Seller Verification	07-Seller-Verification.md	Completed
08	Verification Document	08-Verification-Document.md	Completed
09	Seller Address	09-Seller-Address.md	Completed
7. Category Management

Responsible for marketplace categories, seller category permissions, and category-level commission configuration.

#	Entity	File	Status
10	Category	10-Category.md	Completed
11	Seller Category	11-Seller-Category.md	Completed
12	Category Commission	12-Category-Commission.md	Completed
Important Category Rule

Category approval is seller-specific.

A seller must receive approval for a category before creating products under that category.

One seller's category approval does not automatically approve another seller.

Multiple sellers may sell products under the same category.

8. Product Management

Responsible for marketplace product listings and product-related information.

#	Entity	File	Status
13	Product	13-Product.md	Pending
14	Product Image	14-Product-Image.md	Pending
15	Product Specification	15-Product-Specification.md	Pending
Important Product Rules
Multiple sellers can sell products under the same category.
The Super Admin can also sell products.
A seller can manage only their own products.
Sellers cannot manage another seller's products.
Sellers cannot manage Super Admin-owned products.
Product-level approval is not required in the current workflow.
Category approval is required before a seller can create products under that category.
A seller can edit, delete, pause, hide, and duplicate their own products.
Stock reaching zero should automatically make the product unavailable/out of stock.
Historical order information must not depend on mutable current product data.
9. Inventory Management

Responsible for current product stock and inventory movement history.

#	Entity	File	Status
16	Inventory	16-Inventory.md	Pending
17	Inventory History	17-Inventory-History.md	Pending
Important Inventory Rules
Sellers can update the stock of their own products.
When stock reaches zero, the product should automatically show as out of stock.
Inventory changes must be traceable.
Inventory behavior must remain consistent with cart and order operations.
10. Customer Management

Responsible for customer profile information and customer delivery addresses.

#	Entity	File	Status
18	Customer Profile	18-Customer-Profile.md	Pending
19	Address	19-Address.md	Pending
Important Customer Rules
Customers can view marketplace products without logging in.
Customers must log in to perform authenticated customer operations.
Customers cannot manage seller products.
Customers do not have a seller-following feature in the current scope.
11. Shopping Management

Responsible for customer cart functionality.

#	Entity	File	Status
20	Cart	20-Cart.md	Pending
21	Cart Item	21-Cart-Item.md	Pending
Important Shopping Rules
A cart belongs to a customer.
Cart items reference products.
The marketplace uses a single customer payment flow.
A customer's cart may contain products from multiple sellers.
Multi-seller cart behavior must be compatible with internal order splitting.
12. Order Management

Responsible for the complete customer order lifecycle.

#	Entity	File	Status
22	Order	22-Order.md	Pending
23	Order Item	23-Order-Item.md	Pending
24	Order Status History	24-Order-Status-History.md	Pending
Important Order Rules
A customer can purchase products from multiple sellers.
Multi-seller orders must be internally split for seller-specific processing.
The customer experiences the purchase as a single payment flow.
A customer can cancel the complete order.
A customer can cancel individual products/items within an order where cancellation is allowed.
Historical product price and applicable financial information must be preserved in order records.
Order status changes must be traceable.
Order design must support refunds, returns, shipping, commission, and settlements.
13. Payment Management

Responsible for customer payment records and payment gateway transactions.

#	Entity	File	Status
25	Payment	25-Payment.md	Pending
26	Payment Transaction	26-Payment-Transaction.md	Pending
Important Payment Rules
The customer makes payment through the marketplace payment flow.
Payment records must remain associated with the relevant order.
Payment transaction information must be traceable.
Payment design must support refunds.
Payment information must be protected and must not expose sensitive payment credentials.
14. Return & Refund Management

Responsible for customer return requests and refund processing.

#	Entity	File	Status
27	Return Request	27-Return-Request.md	Pending
28	Refund	28-Refund.md	Pending
Important Refund Rules
The customer receives the refund after the required return process is completed.
A refund reason is required.
The Super Admin approves the refund.
The complete applicable amount is refunded according to the approved refund.
Refunds must be reflected in seller settlement calculations.
Refund processing must remain traceable.
15. Settlement Management

Responsible for seller earnings, commission deductions, and weekly seller settlements.

#	Entity	File	Status
29	Settlement	29-Settlement.md	Pending
30	Settlement Item	30-Settlement-Item.md	Pending
Important Settlement Rules
Sellers are settled weekly.
The Super Admin manually initiates settlement using an administrative action/button.
Sellers can view settlement history.
Sellers can download settlement reports.
Commission is percentage-based.
Commission changes apply only to new orders after the change becomes effective.
Existing orders retain the commission applicable when those orders were created.
Refunds and returns must be considered before final seller settlement.
The settlement design must prevent sellers from being incorrectly paid for amounts that later require refund/reversal.
16. Notification Management

Responsible for system-generated notifications.

#	Entity	File	Status
31	Notification	31-Notification.md	Pending
32	Notification Template	32-Notification-Template.md	Pending
Required Notification Events

The system should support notifications for:

Seller approved
Category approved
Product rejected
Order placed
Settlement completed
Customer refund

Additional notification events may be added as required by future workflows.

17. Reporting & Audit

Responsible for audit history, activity tracking, and report metadata.

#	Entity	File	Status
33	Audit Log	33-Audit-Log.md	Pending
34	Activity Log	34-Activity-Log.md	Pending
35	Report Metadata	35-Report-Metadata.md	Pending
Important Reporting Rules

The marketplace requires reporting for all major business areas.

Reports may include:

Sales
Revenue
Commission
Seller performance
Seller verification
Seller settlements
Product sales
Inventory
Orders
Refunds
Customers
Categories

The final reporting structure will be defined during detailed reporting design.

18. Complete Entity List

The complete currently identified entity set is:

#	Domain	Entity	Status
01	Identity & Access	User	Completed
02	Identity & Access	Role	Completed
03	Identity & Access	Session	Completed
04	Identity & Access	Refresh Token	Completed
05	Identity & Access	Password Reset Token	Completed
06	Seller Management	Seller Profile	Completed
07	Seller Management	Seller Verification	Completed
08	Seller Management	Verification Document	Completed
09	Seller Management	Seller Address	Completed
10	Category Management	Category	Completed
11	Category Management	Seller Category	Completed
12	Category Management	Category Commission	Completed
13	Product Management	Product	Pending
14	Product Management	Product Image	Pending
15	Product Management	Product Specification	Pending
16	Inventory Management	Inventory	Pending
17	Inventory Management	Inventory History	Pending
18	Customer Management	Customer Profile	Pending
19	Customer Management	Address	Pending
20	Shopping Management	Cart	Pending
21	Shopping Management	Cart Item	Pending
22	Order Management	Order	Pending
23	Order Management	Order Item	Pending
24	Order Management	Order Status History	Pending
25	Payment Management	Payment	Pending
26	Payment Management	Payment Transaction	Pending
27	Return & Refund Management	Return Request	Pending
28	Return & Refund Management	Refund	Pending
29	Settlement Management	Settlement	Pending
30	Settlement Management	Settlement Item	Pending
31	Notification Management	Notification	Pending
32	Notification Management	Notification Template	Pending
33	Reporting & Audit	Audit Log	Pending
34	Reporting & Audit	Activity Log	Pending
35	Reporting & Audit	Report Metadata	Pending
19. Entity Dependency Order

The detailed entity documentation should be developed in an order that respects business dependencies.

The current recommended sequence is:

Identity & Access
        ↓
Seller Management
        ↓
Category Management
        ↓
Product Management
        ↓
Inventory Management
        ↓
Customer Management
        ↓
Shopping Management
        ↓
Order Management
        ↓
Payment Management
        ↓
Return & Refund Management
        ↓
Settlement Management
        ↓
Notification Management
        ↓
Reporting & Audit

This is a documentation dependency order.

It does not necessarily mean that the backend implementation must be completed strictly in this exact order.

20. Important Marketplace Context

The following business decisions have already been established and must remain consistent across all entity designs.

Seller Types

The marketplace supports:

Individual sellers
Business sellers

The Super Admin is the marketplace owner/client and is also able to sell products like another seller.

Seller Verification

Seller verification is required before the seller can operate as an approved seller.

Seller verification includes the relevant identity/business documents according to the seller type and marketplace rules.

The Super Admin performs seller verification.

Seller verification supports statuses such as:

Pending
Approved
Rejected
Suspended
Blocked

The Super Admin can suspend an approved seller and can permanently block a seller according to the approved business rules.

Category Approval

Category permission is seller-specific.

Seller A
   ↓
Requests Shoes
   ↓
Admin approves
   ↓
Seller A can sell Shoes

Another seller must independently obtain permission:

Seller B
   ↓
Requests Shoes
   ↓
Separate approval

Multiple sellers can sell within the same category.

The seller does not need approval for every individual product once the relevant category has been approved.

Product Approval

Individual product approval is not required in the current marketplace workflow.

Category approval controls the seller's ability to create products.

Seller Approved
      ↓
Category Approved
      ↓
Products Can Be Created
Product Ownership

Every product belongs to one seller.

Multiple sellers can sell products within the same category.

The Super Admin can also own and sell products.

Sellers can manage only their own products.

Commission

Commission is percentage-based.

The Super Admin controls category commission.

Commission changes apply only to new orders after the new commission becomes effective.

Historical orders must retain their original commission information.

Inventory

When available stock becomes zero:

Stock = 0
   ↓
Out of Stock

The seller can update the stock of their own products.

Orders

A customer may purchase products from multiple sellers in one customer order.

The system should internally split/process seller-specific order information while maintaining the appropriate customer payment experience.

Customers can cancel:

The complete order
Individual products/items where cancellation is allowed
Shipping

Shipping requirements are not fully finalized yet.

The following questions remain subject to the shipping design decision:

Who ships?
Seller, Admin, or third party?
Who pays shipping?
Customer, Seller, or Admin?
Can each seller define shipping charges?

Therefore, shipping-specific database decisions must not be treated as finalized until the shipping business rules are confirmed.

Settlement

Seller settlement occurs weekly.

The Super Admin manually initiates settlement.

Sellers can:

View settlement history.
Download settlement reports.

Refunds and returns must be accounted for before the final amount paid to the seller.

Customer

Customers can browse products without logging in.

Authentication is required for customer operations that require an account.

Customer following of sellers is not part of the current scope.

Future Features

The client indicated that the following features may be required in the future:

Coupons
Wishlist
Seller subscription plans
Product variants such as size and color
Digital products
Bulk product upload using CSV/Excel
Customer-seller chat
Promotional banners
Featured products

Multi-language support is currently not required.

Future features should be designed so that they can be introduced without unnecessarily redesigning existing core entities.

21. Important Design Rules
Rule 1 — Do Not Invent Business Requirements

Entity designs must be based on:

Client requirements
Existing business workflows
SRS
Architecture
Confirmed design decisions

If a requirement is unknown, mark it as:

Needs Clarification

rather than silently inventing a business rule.

Rule 2 — Preserve Historical Financial Data

Financial information that affects historical transactions must be captured as a snapshot where necessary.

Examples include:

Product price at order time
Commission rate at order time
Applicable financial amounts
Refund amounts
Settlement amounts

Current mutable configuration must not be used to reconstruct historical transactions incorrectly.

Rule 3 — Enforce Ownership

Whenever an entity belongs to a seller or customer, backend authorization must ensure that users can access and modify only records they are authorized to manage.

Rule 4 — Preserve Auditability

Critical administrative and financial actions should remain traceable.

Examples:

Seller approval
Seller rejection
Category approval
Category revocation
Commission changes
Product deletion
Refund approval
Settlement execution
Rule 5 — Do Not Treat Future Features as Current Requirements

Future features may influence extensibility but should not automatically be implemented in the initial database schema unless they are explicitly included in the approved scope.

22. Current Progress
Total Identified Entities: 35

Completed:
12

Pending:
23

Progress:
12 / 35
Completed
01 User
02 Role
03 Session
04 Refresh Token
05 Password Reset Token
06 Seller Profile
07 Seller Verification
08 Verification Document
09 Seller Address
10 Category
11 Seller Category
12 Category Commission
Next Entity
13 Product
23. Workflow for Completing Entities

For every pending entity:

Review the client requirements.
Review related business workflows.
Review the SRS.
Review the architecture and module ownership.
Identify entity attributes.
Define validation rules.
Define business rules.
Define lifecycle/state transitions.
Define relationships.
Define security requirements.
Define audit requirements.
Define future extensibility requirements.
Review consistency with already completed entities.
Mark the entity as Completed only after review.
24. Source of Truth

The following documents collectively define the database design context:

Business Requirements
        ↓
business-workflows.md
        ↓
SRS.md
        ↓
architecture.md
        ↓
database-design.md
        ↓
entities/*.md

database-design.md defines the high-level database structure and entity organization.

The individual files inside this directory define the detailed specifications for each entity.

The entity files must remain consistent with the high-level database design.

If a conflict is discovered between an entity file and a higher-level requirement, the conflict must be identified and resolved before implementation.

25. Change Management

When an entity is changed:

Update the relevant entity file.
Check its relationships with dependent entities.
Check whether database-design.md needs updating.
Check whether API design is affected.
Check whether architecture is affected.
Check whether business workflows or SRS are affected.
Record significant design changes in the appropriate decision/change documentation.

Entity changes should not be made in isolation when they affect other business domains.

26. Current Design Decisions Requiring Attention

The following areas have not been fully finalized and should be handled carefully during detailed entity design:

Shipping

The marketplace still requires final decisions regarding:

Shipping responsibility
Shipping charges
Seller-defined shipping
Third-party shipping
Shipping payment responsibility
Product Status

The high-level database-design.md currently mentions Product Status under Product Management, but it is not separately defined in the Entity Identification section.

Current working assumption:

Product Status
      ↓
Likely represented as a Product status field / enum
      ↓
Not currently treated as a separate entity

This must be confirmed before implementation.

Financial Calculations

The exact treatment of:

Taxes
Discounts
Shipping charges
Commission
Refunds
Returns
Settlement deductions

must remain consistent across Product, Order, Payment, Refund, and Settlement designs.

27. Final Principle

The goal of this directory is not merely to document database tables.

It is to create a clear and implementation-ready representation of the marketplace's business data model.

Every entity should answer:

What is this entity?
Why does it exist?
Who owns it?
Who uses it?
What data does it store?
What values are valid?
What business rules govern it?
How does it change over time?
What entities does it relate to?
Who can access or modify it?
What must be preserved historically?
How can it support future requirements?

The detailed entity files should remain the authoritative documentation for their respective entities.


### One important point

Your current `database-design.md` lists the domains and entity names, so this README is **derived from that existing structure**, rather than creating a new entity model independently. For example, your source currently defines Product Management as Product, Product Image, Product Specification, and Product Status. :contentReference[oaicite:0]{index=0}

I deliberately marked **Product Status as "needs attention" rather than creating a 36th entity**, because your Entity Identification section doesn't actually define it as a standalone entity. :contentReference[oaicite:1]{index=1}

**After you paste this README, our next step should be `13-Product.md`.** We should not change the entity numbering again unless a genuine requirement requires it.