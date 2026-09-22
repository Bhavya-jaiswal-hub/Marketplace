database-design.md

1. Purpose

2. Database Design Principles

3. Database Overview

4. Entity Identification

5. Entity Relationships

6. Data Ownership

7. Naming Conventions

8. Constraints & Business Rules

9. Indexing Strategy (High Level)

10. Future Database Evolution 


# Database Design

## Document Information

| Field | Value |
|--------|--------|
| Document Name | Database Design |
| Product | Multi-Vendor Marketplace |
| Version | 1.0 |
| Status | Draft |
| Prepared By | Bhavya Jaiswal |
| Approved By | Super Admin (Client) |
| Last Updated | DD-MM-YYYY |

---

# 1. Purpose

## 1.1 Overview

This document defines the high-level database design for the Multi-Vendor Marketplace.

It identifies the business entities, their relationships, ownership, constraints, and data organization required to support the marketplace's business operations.

The database design serves as the foundation for backend implementation, API development, reporting, and future system enhancements.

---

## 1.2 Objectives

The objectives of this document are to:

- Identify all business entities.
- Define relationships between entities.
- Establish data ownership.
- Support business workflows.
- Maintain data integrity.
- Enable future scalability.
- Guide backend implementation.

---

## 1.3 Scope

This document covers:

- Business entities
- Entity relationships
- Data ownership
- Business constraints
- Database principles

This document does not include:

- SQL scripts
- ORM models
- Migration files
- Database-specific syntax
- Performance tuning
- Infrastructure configuration

These topics will be addressed during implementation.

---

## 1.4 Relationship with Other Documents

The database design is derived from:

Business Workflows

↓

Software Requirements Specification (SRS)

↓

Software Architecture

↓

Database Design (This Document)

↓

API Design

↓

Implementation  



# 2. Database Design Principles

The database for the Multi-Vendor Marketplace shall be designed according to the following principles.

---

## DP-1 Business-Oriented Design

The database shall be modeled around business entities and business processes rather than application screens or APIs.

Examples of business entities include:

- User
- Seller
- Product
- Order
- Payment
- Settlement

---

## DP-2 Single Source of Truth

Each business entity shall have a single authoritative source of data.

Information shall not be duplicated unless required for business or performance reasons.

For example:

- Seller information shall exist only in the Seller module.
- Product information shall exist only in the Product module.
- Commission rules shall exist only in the Category Management module.

---

## DP-3 Referential Integrity

Relationships between entities shall maintain referential integrity.

Every reference to another business entity shall always point to a valid record.

Invalid or orphaned relationships shall not exist.

---

## DP-4 Normalization

The database shall be normalized to reduce redundancy and maintain data consistency.

Data duplication shall be minimized while preserving efficient business operations.

---

## DP-5 Data Ownership

Every business entity shall be owned by a single business module.

Examples:

- User → User Management
- Seller Verification → Seller Verification
- Product → Product Management
- Order → Order Management
- Settlement → Settlement Management

Other modules may reference these entities but shall not own or directly manage them.

---

## DP-6 Auditability

Critical business operations shall maintain historical records for auditing purposes.

Examples include:

- Seller approvals
- Category approvals
- Commission changes
- Order status updates
- Refund approvals
- Settlement execution

Audit records shall remain immutable once created.

---

## DP-7 Soft Deletion

Business entities that require historical tracking shall be logically deleted rather than permanently removed.

Soft deletion preserves historical records while preventing accidental data loss.

Examples include:

- Products
- Categories
- Sellers
- Customers

---

## DP-8 Data Consistency

Business transactions shall maintain consistent data across all related entities.

Operations involving multiple entities shall either complete successfully or leave the system unchanged.

---

## DP-9 Extensibility

The database shall support future business requirements without requiring significant structural redesign.

Future features such as:

- Coupons
- Wishlist
- Reviews
- Product Variants
- Seller Subscription Plans

should integrate naturally into the existing data model.

---

## DP-10 Security

Sensitive business information shall be stored securely and accessed only by authorized users.

Examples include:

- Aadhaar details
- PAN details
- Financial records
- Settlement history
- Payment information

---

## DP-11 Performance Awareness

The database shall be designed to efficiently support expected marketplace operations while remaining maintainable.

Performance optimizations shall not compromise data integrity or business correctness.

---

## DP-12 Scalability

The database design shall support future growth in:

- Customers
- Sellers
- Products
- Orders
- Transactions
- Reports

without requiring major redesign of the data model.

---

## DP-13 Maintainability

The database structure shall remain clear, modular, and easy to understand.

Entity relationships and naming conventions shall be consistent throughout the system.

---

## DP-14 Future Compatibility

The database design shall remain compatible with future architectural evolution, including:

- Background processing
- Distributed services
- Read replicas
- Multi-region deployment
- Microservice migration (if required)

without affecting existing business workflows.  



# 3. Database Overview

## 3.1 Overview

The Multi-Vendor Marketplace database is organized around business domains. Each domain represents a specific business capability and contains the entities required to support that capability.

The database is designed to maintain clear ownership of data, reduce coupling between business domains, and support future business expansion.

Each business domain owns its entities while interacting with other domains through well-defined relationships.

---

## 3.2 Business Domains

The database consists of the following business domains:

### Identity & Access Management

Responsible for managing platform users and authentication.

Major Entities:

- User
- Role
- Session
- Refresh Token
- Password Reset Token

---

### Seller Management

Responsible for onboarding and managing marketplace sellers.

Major Entities:

- Seller Profile
- Seller Verification
- Verification Document
- Seller Address

---

### Category Management

Responsible for managing product categories and seller category approvals.

Major Entities:

- Category
- Seller Category
- Category Commission

---

### Product Management

Responsible for managing marketplace products.

Major Entities:

- Product
- Product Image
- Product Specification
- Product Status

---

### Inventory Management

Responsible for tracking product stock.

Major Entities:

- Inventory
- Inventory History

---

### Customer Management

Responsible for customer profile and delivery information.

Major Entities:

- Customer Profile
- Address

---

### Shopping Management

Responsible for customer shopping activities.

Major Entities:

- Cart
- Cart Item

---

### Order Management

Responsible for the complete order lifecycle.

Major Entities:

- Order
- Order Item
- Order Status History

---

### Payment Management

Responsible for payment records and transaction tracking.

Major Entities:

- Payment
- Payment Transaction

---

### Return & Refund Management

Responsible for return requests and refund processing.

Major Entities:

- Return Request
- Refund

---

### Settlement Management

Responsible for seller earnings and commission settlements.

Major Entities:

- Settlement
- Settlement Item

---

### Notification Management

Responsible for marketplace notifications.

Major Entities:

- Notification
- Notification Template

---

### Reporting & Audit

Responsible for reporting and audit history.

Major Entities:

- Audit Log
- Activity Log
- Report Metadata

---

## 3.3 High-Level Domain Relationship

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

---

## 3.4 Database Organization Goals

The database organization is intended to achieve:

- Clear ownership of business data.
- Minimal duplication of information.
- Strong referential integrity.
- Modular entity organization.
- Easy maintenance.
- Future extensibility.
- Efficient business operations.

---

## 3.5 Database Overview Summary

The Multi-Vendor Marketplace database is organized into independent business domains that closely align with the software architecture and business modules.

This alignment ensures consistency between business requirements, software architecture, database design, API design, and implementation, making the system easier to understand, maintain, and extend over time.  


# 4. Entity Identification

## 4.1 Overview

This section identifies all business entities required to support the Multi-Vendor Marketplace.

Each entity represents a distinct business concept with a clearly defined purpose and ownership.

The identified entities serve as the foundation for relationship design, schema design, API design, and backend implementation.

---

# 4.2 Identity & Access Management

## User

**Purpose**

Represents every authenticated user of the marketplace.

**Owned By**

Identity & Access Management

**Used By**

- Authentication
- Customer
- Seller
- Super Admin

---

## Role

**Purpose**

Defines the role assigned to a user within the marketplace.

**Owned By**

Identity & Access Management

**Used By**

- Authentication
- Authorization

---

## Session

**Purpose**

Represents an authenticated user session.

**Owned By**

Identity & Access Management

---

## Refresh Token

**Purpose**

Represents refresh tokens used for session renewal.

**Owned By**

Identity & Access Management

---

## Password Reset Token

**Purpose**

Represents temporary tokens used during password reset.

**Owned By**

Identity & Access Management

---

# 4.3 Seller Management

## Seller Profile

**Purpose**

Stores seller-specific business information.

**Owned By**

Seller Management

---

## Seller Verification

**Purpose**

Tracks seller verification lifecycle.

**Owned By**

Seller Management

---

## Verification Document

**Purpose**

Stores seller verification documents such as Aadhaar, PAN, GST (optional), and photographs.

**Owned By**

Seller Management

---

## Seller Address

**Purpose**

Stores seller business address information.

**Owned By**

Seller Management

---

# 4.4 Category Management

## Category

**Purpose**

Represents product categories available in the marketplace.

**Owned By**

Category Management

---

## Seller Category

**Purpose**

Represents category approval granted to a seller.

**Owned By**

Category Management

---

## Category Commission

**Purpose**

Stores commission percentages for each category.

**Owned By**

Category Management

---

# 4.5 Product Management

## Product

**Purpose**

Represents products listed by sellers or the Super Admin.

**Owned By**

Product Management

---

## Product Image

**Purpose**

Stores images associated with products.

**Owned By**

Product Management

---

## Product Specification

**Purpose**

Stores additional product attributes and specifications.

**Owned By**

Product Management

---

# 4.6 Inventory Management

## Inventory

**Purpose**

Tracks current product stock.

**Owned By**

Inventory Management

---

## Inventory History

**Purpose**

Maintains inventory movement history.

**Owned By**

Inventory Management

---

# 4.7 Customer Management

## Customer Profile

**Purpose**

Stores customer-specific profile information.

**Owned By**

Customer Management

---

## Address

**Purpose**

Stores customer delivery addresses.

**Owned By**

Customer Management

---

# 4.8 Shopping Management

## Cart

**Purpose**

Represents a customer's active shopping cart.

**Owned By**

Shopping Management

---

## Cart Item

**Purpose**

Represents products added to a shopping cart.

**Owned By**

Shopping Management

---

# 4.9 Order Management

## Order

**Purpose**

Represents a customer purchase transaction.

**Owned By**

Order Management

---

## Order Item

**Purpose**

Represents individual products within an order.

**Owned By**

Order Management

---

## Order Status History

**Purpose**

Maintains the complete lifecycle history of an order.

**Owned By**

Order Management

---

# 4.10 Payment Management

## Payment

**Purpose**

Represents payment information for customer orders.

**Owned By**

Payment Management

---

## Payment Transaction

**Purpose**

Stores payment gateway transaction details.

**Owned By**

Payment Management

---

# 4.11 Return & Refund Management

## Return Request

**Purpose**

Represents customer return requests.

**Owned By**

Return & Refund Management

---

## Refund

**Purpose**

Represents refunds processed for returned products.

**Owned By**

Return & Refund Management

---

# 4.12 Settlement Management

## Settlement

**Purpose**

Represents weekly seller settlements.

**Owned By**

Settlement Management

---

## Settlement Item

**Purpose**

Represents individual order earnings included in a settlement.

**Owned By**

Settlement Management

---

# 4.13 Notification Management

## Notification

**Purpose**

Represents notifications sent to marketplace users.

**Owned By**

Notification Management

---

## Notification Template

**Purpose**

Stores reusable notification templates.

**Owned By**

Notification Management

---

# 4.14 Reporting & Audit

## Audit Log

**Purpose**

Stores audit records for critical business operations.

**Owned By**

Reporting & Audit

---

## Activity Log

**Purpose**

Stores user activity history.

**Owned By**

Reporting & Audit

---

## Report Metadata

**Purpose**

Stores report generation metadata and history.

**Owned By**

Reporting & Audit

---

## 4.15 Entity Summary

The Multi-Vendor Marketplace consists of business entities grouped into logical domains.

Each entity has a single business owner responsible for maintaining its lifecycle and business rules.

These entities form the foundation for the relationship model, database schema, API contracts, and backend implementation. 

---

# 5. Entity Relationships

## 5.1 Identity Relationships

- User has one Role assignment according to the authorization model.
- User may have many Sessions, Refresh Tokens, Password Reset Tokens, Notifications, Activity Logs, and Audit Logs.
- A User may own one Seller Profile or one Customer Profile according to the account model.

## 5.2 Seller and Category Relationships

- Seller Profile belongs to User.
- Seller Profile may have many Seller Addresses and Verification Documents.
- Seller Profile has verification lifecycle records through Seller Verification.
- Seller Profile and Category are related through Seller Category.
- Seller Category approval is seller-specific and must be unique for the seller/category pair.
- Category may have a parent Category and many child categories.
- Category has commission configuration with effective historical values.

## 5.3 Product and Inventory Relationships

- Product belongs to one Seller and one Category in Version 1.
- Product has many Product Images and Product Specifications.
- Product has one Inventory record and many Inventory History records.
- Product may be referenced by many Cart Items and Order Items.

## 5.4 Customer and Shopping Relationships

- Customer Profile belongs to User and may have many Addresses.
- Customer has an active Cart containing many Cart Items.
- Cart Item references one Product and stores the requested quantity.

## 5.5 Order and Financial Relationships

- Order belongs to one Customer and contains one or more Order Items.
- Order Item references Product and Seller and stores immutable purchase snapshots.
- Order may have payment attempts and finalized Payment Transactions.
- Return Requests reference an Order and Order Item and may produce Refunds.
- Settlement belongs to one Seller and contains Settlement Items derived from eligible Order Items.
- Settlement, Refund, Payment Transaction, commission, and order snapshots must remain traceable.

## 5.6 Relationship Integrity

Foreign-key relationships, unique constraints, state validation, and transactional service operations must prevent orphaned or contradictory records. Cross-module references must use defined interfaces and must not bypass the owning module's rules.

# 6. Data Ownership

| Domain | Owning entities |
|---|---|
| Identity & Access | User, Role, Session, Refresh Token, Password Reset Token |
| Seller Management | Seller Profile, Seller Verification, Verification Document, Seller Address |
| Category Management | Category, Seller Category, Category Commission |
| Product Management | Product, Product Image, Product Specification |
| Inventory Management | Inventory, Inventory History |
| Customer Management | Customer Profile, Address |
| Shopping Management | Cart, Cart Item |
| Order Management | Order, Order Item, Order Item History |
| Payment Management | Payment Pending, Payment Transaction |
| Return & Refund | Return Request, Refund |
| Settlement Management | Settlement, Settlement Item |
| Notification Management | Notification, Notification Template |
| Reporting & Audit | Audit Log, Activity Log, Report Metadata |

Other domains may read information through service interfaces but may not directly mutate another domain's entities or repositories.

# 7. Naming Conventions

- Entity and table names must use one approved terminology across entity, API, and feature documents.
- Identifiers use a consistent ID type and naming pattern such as `userId`, `sellerId`, and `orderItemId`.
- Timestamps use consistent `createdAt`, `updatedAt`, and domain-specific lifecycle timestamps.
- Status values use a controlled set defined by the owning entity.
- Monetary values use a consistent precision and currency representation.
- Historical snapshot fields must be named distinctly from current mutable fields.
- Soft-deletion fields use the approved logical deletion convention, such as `deletedAt` or an explicit inactive status.

# 8. Constraints and Business Rules

## 8.1 General Constraints

- Required fields must be non-null.
- Email and mobile identity values must be unique where applicable.
- Passwords, payment credentials, refresh tokens, and reset-token secrets must never be stored or exposed in raw form.
- References must point to valid records.
- Critical multi-entity operations must be transactional or use durable workflow compensation.

## 8.2 Marketplace Constraints

- Only approved sellers may perform restricted seller operations.
- Sellers may create products only in approved categories.
- Products use one category in Version 1.
- Product and seller ownership must be enforced server-side.
- Inventory cannot become negative.
- Orders require successful payment confirmation before becoming paid/confirmed.
- Current commission changes apply only to future orders.
- Completed orders, refunds, settlements, and audit records retain historical financial meaning.

## 8.3 Financial Constraints

- Order Item price and commission snapshots are immutable after order confirmation.
- Refund totals cannot exceed the successfully paid/refundable amount.
- An Order Item cannot be settled more than once for the same settlement component.
- Completed settlements cannot be modified or deleted in a way that changes their financial meaning.
- Settlement eligibility uses the approved holding-period policy; the exact duration remains a client decision.

# 9. Indexing Strategy

The implementation should index fields used for identity, ownership, workflow queues, and high-volume queries, including:

- User email and mobile number.
- Foreign keys such as seller, customer, category, product, order, payment, and settlement IDs.
- Product SKU, status, category, seller, and searchable marketplace fields.
- Seller verification and category-request status with timestamps.
- Order number, customer, seller-derived order-item access, status, and creation date.
- Payment references, provider transaction IDs, and payment status.
- Return, refund, and settlement status with eligibility/processing dates.
- Notification recipient and read status.
- Audit/activity actor, action, entity reference, and timestamp.

Indexes must be validated against real query patterns and must not replace business constraints or unique indexes.

# 10. Future Database Evolution

The model should support future additions such as Product Variant, Product Category join records for multi-category products, seller payout records, shipment records, coupons, reviews, subscriptions, and multi-warehouse inventory. Active Customer Address records are required in Version 1 and are part of the current model, not future evolution.

Future schema changes must use reviewed migrations, preserve historical financial records, remain backward-compatible where practical, and avoid changing existing entity meaning without an explicit migration plan.

The current entity folder remains the detailed source for entity behavior. New entities required by the SRS must be specified before their APIs and implementation are finalized.



 

 







  






















