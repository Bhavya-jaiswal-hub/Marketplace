docs/

SRS.md

1. Document Information
2. Revision History
3. Introduction
4. Project Overview
5. Objectives
6. Scope
7. Stakeholders
8. User Roles
9. Functional Requirements
10. Non-Functional Requirements
11. Business Rules
12. Business Workflows
13. Use Cases
14. Assumptions
15. Constraints
16. Future Scope
17. Acceptance Criteria
18. Glossary


# Software Requirements Specification (SRS)

**Project:** Multi-Vendor Marketplace

**Version:** 1.0

**Status:** Draft

**Author:** Bhavya Jaiswal

**Document Owner:** Product & Engineering Team

**Last Updated:** YYYY-MM-DD

---

# Revision History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | YYYY-MM-DD | Bhavya Jaiswal | Initial draft |

--- 



Section 1 — Introduction


## 1.3 Project Overview

The Multi-Vendor Marketplace is an e-commerce platform where multiple independent sellers can register, complete a verification process, receive approval from the Super Admin, and sell products belonging to approved categories.

Customers can browse products from multiple sellers, add them to a single cart, complete checkout using a unified payment process, and manage their orders through a single platform.

The Super Admin manages seller verification, category approvals, commission rules, settlements, reports, and can also participate as a seller by listing and selling products. 



Section 2 — Product Objectives

# 2. Product Objectives

The objectives of the Multi-Vendor Marketplace are:

- Allow multiple independent sellers to sell products through a single platform.
- Ensure seller authenticity through an administrative verification process.
- Allow sellers to sell products only within approved categories.
- Provide customers with a seamless shopping experience across multiple sellers.
- Support a unified checkout process for products from different sellers.
- Manage platform commissions based on product categories.
- Hold customer payments securely before settling earnings with sellers.
- Support returns, refunds, and settlement management.
- Provide comprehensive dashboards and reports for administrators and sellers.
- Build a scalable foundation that supports future marketplace features.


Section 3 — Project Scope

# 3. Project Scope

The platform will provide functionality for three primary user roles:

- Super Admin
- Seller
- Customer

The system includes:

- Seller registration and verification
- Category approval workflow
- Product management
- Inventory management
- Customer account management
- Product browsing and search
- Shopping cart
- Checkout
- Order management
- Payment processing
- Returns and refunds
- Weekly seller settlements
- Notification system
- Reporting and analytics
- Administrative dashboard

The system is designed to support future enhancements including coupons, wishlists, promotional campaigns, product variants, seller subscription plans, digital products, bulk product uploads, customer-seller communication, and featured products.



# 4. Stakeholders

The following stakeholders are involved in the development, operation, and usage of the Multi-Vendor Marketplace.

## 4.1 Super Admin (Marketplace Owner)

The Super Admin is the owner of the marketplace and the primary stakeholder of the system. The Super Admin defines the business requirements, marketplace policies, and operational rules while also managing the day-to-day operations of the platform.

Responsibilities:

- Own and manage the marketplace.
- Define business objectives.
- Approve system requirements.
- Define seller verification policies.
- Define commission policies.
- Verify sellers.
- Approve or reject seller registrations.
- Approve or reject seller category requests.
- Manage commissions.
- Manage settlements.
- Manage reports and analytics.
- Sell products through the platform.
- Manage own products and categories.

---

## 4.2 Sellers

Sellers are Individuals or Businesses approved by the Super Admin to sell products on the marketplace.

Responsibilities:

- Maintain profile information.
- Upload products.
- Manage inventory.
- Process received orders.
- Request new selling categories.
- View settlements and reports.

---

## 4.3 Customers

Customers browse products, purchase products, manage orders, request returns, and receive refunds.

Responsibilities:

- Maintain account information.
- Purchase products.
- Manage orders.
- Request returns.
- Submit product reviews (Future Feature).

---

## 4.4 Development Team

The engineering team responsible for designing, developing, testing, deploying, and maintaining the platform.

Includes:

- Solution Architect
- Backend Developers
- Frontend Developers
- UI/UX Designers
- QA Engineers
- DevOps Engineers



# 5. User Roles

The platform supports three primary user roles.

## 5.1 Super Admin

The Super Admin has complete control over the marketplace.

Capabilities include:

- Login securely.
- Verify sellers.
- Reject sellers.
- Suspend or block sellers.
- Approve seller categories.
- Reject seller categories.
- Configure category commissions.
- Manage settlements.
- View reports.
- View analytics.
- Manage notifications.
- Sell products like any other seller.
- Manage own categories.
- Manage own products.
- View all orders.
- Manage refunds.

---

## 5.2 Seller

A Seller can be either an Individual or a Business.

Capabilities include:

- Register.
- Upload verification documents.
- Login after approval.
- Update profile.
- Request additional categories.
- Add products.
- Edit products.
- Delete products.
- Hide products.
- Pause products.
- Duplicate products.
- Manage inventory.
- View received orders.
- Process shipments.
- View settlements.
- Download settlement reports.
- Receive notifications.

Restrictions:

- Cannot sell without approval.
- Cannot sell in unapproved categories.
- Cannot edit products belonging to other sellers.
- Cannot edit Admin products.

---

## 5.3 Customer

Capabilities include:

- Register.
- Login.
- Browse products.
- Search products.
- Filter products.
- Add products to cart.
- Purchase products.
- View order history.
- Track orders.
- Cancel products.
- Cancel complete orders.
- Request returns.
- Receive refunds.
- Receive notifications.

Restrictions:

- Cannot purchase without login.
- Cannot manage seller information.


# 6. Functional Requirements

The platform shall provide the following core functional capabilities.

## FR-1 User Authentication

The system shall allow:

- Customer Registration
- Seller Registration
- Admin Login
- Secure Authentication
- Password Reset
- Profile Management

---

## FR-2 Seller Verification

The system shall:

- Accept seller registration.
- Allow Individual and Business registration.
- Accept Aadhaar.
- Accept PAN.
- Accept Address Details.
- Accept Seller Photograph.
- Allow document resubmission.
- Allow Admin approval.
- Allow Admin rejection.
- Store rejection reasons.

---

## FR-3 Category Management

The system shall:

- Allow sellers to request new categories.
- Allow Admin approval.
- Allow Admin rejection.
- Allow Admin to revoke category permission.
- Allow sellers to sell only in approved categories.
- Support category hierarchy.
- Support subcategories.

---

## FR-4 Commission Management

The system shall:

- Store commission percentage for every category.
- Allow Admin to update commission.
- Apply updated commission only to future orders.
- Maintain historical commission data for previous orders.

---

## FR-5 Product Management

The system shall:

- Allow sellers to create products.
- Allow sellers to edit products.
- Allow sellers to delete products.
- Allow sellers to duplicate products.
- Allow sellers to hide products.
- Allow sellers to pause products.
- Support one SKU, price, and inventory record per product; product variants are excluded from Version 1.
- Support product images.
- Assign exactly one category to each product in Version 1.

---

## FR-6 Inventory Management

The system shall:

- Maintain stock quantity.
- Automatically mark products as Out of Stock.
- Allow sellers to update inventory.

---

## FR-7 Customer Shopping

The system shall:

- Display products from multiple sellers.
- Support search.
- Support filters.
- Support sorting.
- Allow customers to maintain a shopping cart.
- Allow products from multiple sellers within one cart.

---

## FR-8 Checkout

The system shall:

- Support a unified checkout.
- Calculate totals.
- Calculate commissions.
- Create a single customer order.
- Internally split orders seller-wise.

---

## FR-9 Order Management

The system shall:

- Create orders.
- Track orders.
- Support order status updates.
- Support partial cancellation.
- Support complete cancellation.

---

## FR-10 Payment Management

The system shall:

- Receive customer payments.
- Hold payments until settlement.
- Maintain payment records.
- Support refund processing.

---

## FR-11 Return & Refund

The system shall:

- Accept return requests.
- Require return reasons.
- Allow Admin approval.
- Process refunds after successful product return verification.

---

## FR-12 Settlement

The system shall:

- Hold seller earnings.
- Allow manual settlement.
- Generate settlement history.
- Generate settlement reports.
- Support weekly settlements.

---

## FR-13 Notifications

The system shall notify users regarding:

- Seller approval
- Seller rejection
- Category approval
- Category rejection
- Order creation
- Settlement completion
- Refund completion

---

## FR-14 Reports & Analytics

The system shall generate:

- Sales Reports
- Revenue Reports
- Commission Reports
- Settlement Reports
- Seller Reports
- Product Reports
- Low Stock Reports
- Pending Verification Reports 


# 9. Non-Functional Requirements

The following non-functional requirements define the quality attributes that the Multi-Vendor Marketplace shall satisfy.

---

## NFR-1 Performance

The system shall provide a responsive user experience under normal operating conditions.

Requirements:

- User authentication should complete within an acceptable response time.
- Product browsing and searching should return results quickly.
- Product pages should load efficiently.
- Order placement should complete without noticeable delays.
- Dashboard pages should load within an acceptable response time.
- The system shall support efficient pagination for large datasets.

---

## NFR-2 Scalability

The system shall be designed to support future business growth.

Requirements:

- Support thousands of sellers.
- Support hundreds of thousands of products.
- Support increasing customer traffic without major architectural redesign.
- Allow additional marketplace features to be introduced without affecting existing functionality.

---

## NFR-3 Security

The system shall protect user accounts, business data, and sensitive information.

Requirements:

- Only authenticated users shall access protected resources.
- Role-based access control shall be enforced throughout the system.
- Sensitive seller documents shall be securely stored.
- Customer payment information shall remain protected.
- The system shall validate all user inputs before processing.
- Administrative operations shall be restricted to authorized users only.

---

## NFR-4 Reliability

The system shall operate consistently without data corruption or unexpected failures.

Requirements:

- Orders shall not be duplicated.
- Payment records shall remain consistent.
- Commission calculations shall always be accurate.
- Settlement records shall remain accurate and traceable.
- Data integrity shall be maintained during failures.

---

## NFR-5 Availability

The platform shall be available to users except during planned maintenance activities.

Requirements:

- Marketplace services should remain accessible during normal business operations.
- Planned maintenance should minimize service interruption.

---

## NFR-6 Maintainability

The system shall be easy to maintain and extend.

Requirements:

- The software shall follow a modular architecture.
- Business logic shall be separated from presentation logic.
- Documentation shall remain updated.
- Future modules shall integrate without significant modification to existing modules.

---

## NFR-7 Usability

The platform shall provide a simple and intuitive user experience.

Requirements:

- User interfaces shall be consistent throughout the application.
- Navigation shall remain simple for Customers, Sellers, and Super Admin.
- Error messages shall clearly explain problems and possible actions.
- Forms shall provide appropriate validation feedback.

---

## NFR-8 Compatibility

The platform shall function consistently across supported devices and browsers.

Requirements:

- Support modern desktop browsers.
- Support modern mobile browsers.
- Support responsive layouts for desktop, tablet, and mobile devices.

---

## NFR-9 Data Integrity

The platform shall preserve the correctness and consistency of business data.

Requirements:

- Product inventory shall always remain synchronized.
- Orders shall maintain complete transaction history.
- Settlement records shall remain immutable after completion.
- Historical commission values shall be preserved for completed orders.

---

## NFR-10 Auditability

The platform shall maintain sufficient audit information for important business operations.

Requirements:

- Record seller verification activities.
- Record category approval activities.
- Record commission changes.
- Record settlement operations.
- Record refund approvals.
- Record important administrative actions.

---

## NFR-11 Backup & Recovery

The platform shall support data recovery in the event of unexpected failures.

Requirements:

- Business-critical data shall be backed up regularly.
- Recovery procedures shall minimize data loss.
- Backup integrity shall be verified periodically.

---

## NFR-12 Logging & Monitoring

The platform shall maintain operational visibility.

Requirements:

- System errors shall be logged.
- Authentication events shall be logged.
- Administrative activities shall be logged.
- Critical business operations shall be traceable for troubleshooting.

---

## NFR-13 Extensibility

The platform shall support future business enhancements.

Requirements:

- New modules shall be added without significant restructuring.
- Future marketplace features shall integrate with existing business workflows.
- The architecture shall support future third-party integrations.

---

## NFR-14 Accessibility

The platform should be usable by a wide range of users.

Requirements:

- Interfaces should use readable fonts and clear layouts.
- Important actions should be easily identifiable.
- Forms should provide clear labels and validation messages.

---

## NFR-15 Compliance

The platform shall comply with applicable business and data management practices.

Requirements:

- Seller verification records shall be maintained securely.
- Customer and seller information shall be handled responsibly.
- Financial records shall remain accurate for reporting and settlement purposes.

# 10. Business Rules

The following business rules define the operational policies of the Multi-Vendor Marketplace. These rules govern how the platform behaves and must be enforced throughout the system.

---

## BR-1 Seller Registration

- A seller may register as either an **Individual** or a **Business**.
- Every seller must complete the registration process before requesting verification.
- A seller account shall remain inactive until approved by the Super Admin.

---

## BR-2 Seller Verification

- Every seller must complete identity verification before selling products.
- Aadhaar, PAN, photograph, and address details are mandatory.
- The Super Admin is responsible for verifying seller documents.
- The Super Admin may approve or reject the seller application.
- Rejection must include a reason.
- A rejected seller may resubmit the required documents.
- Seller verification status shall always be one of:
  - Pending
  - Approved
  - Rejected
  - Suspended
  - Blocked

---

## BR-3 Seller Categories

- Sellers may only sell products within approved categories.
- Sellers may request one or more categories during registration.
- Sellers may request additional categories after approval.
- Every new category request requires separate approval.
- Approval of one category shall not automatically approve other categories.
- The Super Admin may revoke category permission at any time.

---

## BR-4 Category Management

- The Super Admin may create categories for marketplace management.
- Categories may contain subcategories.
- Multiple sellers may sell products within the same category.
- Products belonging to different sellers shall be displayed together within the same category.
- A seller cannot create marketplace categories.

---

## BR-5 Commission Management 

- Every category shall have its own commission percentage.
- Commission is calculated as a percentage of the product selling price.
- The Super Admin may modify commission percentages.
- Updated commission values shall apply only to future orders.
- Completed orders shall always retain the commission rate applicable at the time of purchase.

---

## BR-6 Product Management

- Sellers may create products only within approved categories.
- Sellers may edit, pause, hide, duplicate, or delete only their own products.
- Sellers shall not modify products belonging to other sellers.
- The Super Admin shall not modify seller products.
- Product approval is not required after category approval.
- Products may contain multiple images. Version 1 products do not have variants, and each product has one globally unique SKU, price, and inventory record.
- Each product belongs to exactly one category in Version 1.

---

## BR-7 Inventory

- Every product shall maintain stock quantity.
- Products with zero stock shall automatically become Out of Stock.
- Sellers are responsible for maintaining inventory.
- Customers cannot purchase products that are out of stock.

---

## BR-8 Customer Shopping

- Customers may browse products without logging in.
- Customers must log in before adding products to the cart or placing an order.
- Customers may purchase products from multiple sellers within a single checkout.
- The platform shall internally manage seller-specific order allocation.

---

## BR-9 Orders

- Every successful checkout creates one customer order.
- The system shall internally split the order by seller.
- Each seller shall view only their own order items.
- Customers may cancel:
  - An entire order
  - Individual order items (subject to cancellation policy)

---

## BR-10 Payments

- Customers shall make a single payment during checkout.
- The marketplace shall receive the payment.
- Sellers shall not receive direct customer payments.
- Payment records shall be maintained for every order.

---

## BR-11 Returns & Refunds

- Customers may request returns for eligible products.
- Every return request must include a reason.
- Return requests require Super Admin approval.
- Refunds shall be processed only after successful return verification.
- Approved refunds may be full or partial. Refund the actual discounted amount paid for the eligible item and applicable tax proportionally; do not refund the discount separately. Shipping is partially refundable according to policy, and seller commission is reversed or adjusted.
- The normal return window is five days after delivery. Cancellation refunds and post-delivery return refunds follow separate rules.

---

## BR-12 Seller Settlement

- Seller earnings shall remain on hold after delivery.
- Settlement eligibility begins seven days after delivery and requires no blocking return or refund.
- The Super Admin shall manually initiate settlements.
- Sellers shall have access to settlement history.
- Sellers shall be able to download settlement reports.

---

## BR-13 Notifications

The platform shall notify users regarding important business events including:

- Seller approval
- Seller rejection
- Category approval
- Category rejection
- Order placement
- Order cancellation
- Return approval
- Refund completion
- Settlement completion

---

## BR-14 Marketplace Ownership

- The Super Admin owns and operates the marketplace.
- The Super Admin may also sell products using the same selling workflow as other sellers.
- The Super Admin shall manage marketplace policies, commissions, settlements, reports, and seller verification.

---

## BR-15 Data Ownership

- Sellers own and manage only their own products.
- Customers own their personal accounts and order history.
- The marketplace owns operational records including settlements, commissions, verification history, and audit logs.

---

## BR-16 Future Expansion

The platform shall be designed to support future enhancements without disrupting existing business operations, including:

- Coupons
- Wishlist
- Seller Subscription Plans
- Bulk Product Upload
- Promotional Campaigns
- Featured Products
- Digital Products
- Customer-Seller Chat 


# 11. Use Cases

This section describes the primary interactions between the users and the Multi-Vendor Marketplace system.

---

# 11.1 Super Admin Use Cases

## UC-ADM-01: Login

**Primary Actor:** Super Admin

**Goal:**
Access the administrative dashboard.

**Preconditions:**
- Super Admin account exists.

**Main Flow:**
1. Open login page.
2. Enter credentials.
3. Submit login request.
4. System authenticates user.
5. Dashboard is displayed.

**Postconditions:**
- Super Admin is logged into the system.

---

## UC-ADM-02: Verify Seller

**Primary Actor:** Super Admin

**Goal:**
Approve or reject a seller registration.

**Preconditions:**
- Seller has submitted verification documents.

**Main Flow:**
1. View pending verification requests.
2. Open seller application.
3. Review submitted documents.
4. Approve or reject the application.
5. If rejected, enter rejection reason.
6. System updates seller status.
7. Seller receives notification.

**Postconditions:**
- Seller status is updated.

---

## UC-ADM-03: Approve Seller Category

**Primary Actor:** Super Admin

**Goal:**
Approve or reject requested seller categories.

**Main Flow:**
1. View pending category requests.
2. Review request.
3. Approve or reject.
4. System updates seller permissions.
5. Seller receives notification.

**Postconditions:**
- Category permission updated.

---

## UC-ADM-04: Configure Commission

**Primary Actor:** Super Admin

**Goal:**
Manage category commission percentages.

**Main Flow:**
1. Open Commission Management.
2. Select category.
3. Update commission percentage.
4. Save changes.

**Postconditions:**
- New commission applies to future orders.

---

## UC-ADM-05: Manage Settlements

**Primary Actor:** Super Admin

**Goal:**
Transfer pending seller earnings.

**Main Flow:**
1. View pending settlements.
2. Review settlement amount.
3. Initiate settlement.
4. Record settlement.
5. Notify seller.

**Postconditions:**
- Seller payment marked as settled.

---

## UC-ADM-06: Manage Refund Requests

**Primary Actor:** Super Admin

**Goal:**
Approve or reject customer refund requests.

**Main Flow:**
1. Open pending refunds.
2. Review request.
3. Approve or reject.
4. If approved, process refund.
5. Notify customer and seller.

**Postconditions:**
- Refund request completed.

---

# 11.2 Seller Use Cases

## UC-SEL-01: Register

**Primary Actor:** Seller

**Goal:**
Create a seller account.

**Main Flow:**
1. Open seller registration page.
2. Choose Individual or Business.
3. Enter personal/business information.
4. Upload required documents.
5. Select selling categories.
6. Submit application.

**Postconditions:**
- Seller account created with Pending status.

---

## UC-SEL-02: Resubmit Documents

**Primary Actor:** Seller

**Goal:**
Submit corrected verification documents.

**Preconditions:**
- Previous verification was rejected.

**Main Flow:**
1. View rejection reason.
2. Replace required documents.
3. Submit again.

**Postconditions:**
- Verification returns to Pending.

---

## UC-SEL-03: Request New Category

**Primary Actor:** Seller

**Goal:**
Request permission to sell in additional categories.

**Main Flow:**
1. Open Category Requests.
2. Select new categories.
3. Submit request.

**Postconditions:**
- Request sent to Super Admin.

---

## UC-SEL-04: Manage Products

**Primary Actor:** Seller

**Goal:**
Manage product catalog.

**Main Flow:**
1. Open Product Dashboard.
2. Create/Edit/Delete/Pause/Hide/Duplicate product.
3. Save changes.

**Postconditions:**
- Product catalog updated.

---

## UC-SEL-05: Manage Inventory

**Primary Actor:** Seller

**Goal:**
Maintain product stock.

**Main Flow:**
1. Open Inventory.
2. Update stock quantity.
3. Save changes.

**Postconditions:**
- Inventory updated.

---

## UC-SEL-06: Process Orders

**Primary Actor:** Seller

**Goal:**
Fulfill customer orders.

**Main Flow:**
1. View assigned orders.
2. Pack products.
3. Update shipping information.
4. Mark order as dispatched.

**Postconditions:**
- Order progresses through delivery.

---

## UC-SEL-07: View Settlements

**Primary Actor:** Seller

**Goal:**
View payment history.

**Main Flow:**
1. Open Settlement Dashboard.
2. View completed settlements.
3. Download reports.

**Postconditions:**
- Settlement information displayed.

---

# 11.3 Customer Use Cases

## UC-CUS-01: Register

**Primary Actor:** Customer

**Goal:**
Create a customer account.

**Main Flow:**
1. Register.
2. Verify account (if applicable).
3. Login.

**Postconditions:**
- Customer account created.

---

## UC-CUS-02: Browse Products

**Primary Actor:** Customer

**Goal:**
Discover products.

**Main Flow:**
1. Browse categories.
2. Search products.
3. Apply filters.
4. View product details.

**Postconditions:**
- Product information displayed.

---

## UC-CUS-03: Purchase Products

**Primary Actor:** Customer

**Goal:**
Purchase products.

**Main Flow:**
1. Login.
2. Add products to cart.
3. Checkout.
4. Complete payment.
5. Order created.

**Postconditions:**
- Order successfully placed.

---

## UC-CUS-04: Cancel Order

**Primary Actor:** Customer

**Goal:**
Cancel eligible products.

**Main Flow:**
1. Open orders.
2. Select product(s).
3. Cancel.
4. Confirm.

**Postconditions:**
- Order updated.

---

## UC-CUS-05: Request Return

**Primary Actor:** Customer

**Goal:**
Return purchased products.

**Main Flow:**
1. Open delivered orders.
2. Select product.
3. Choose return reason.
4. Submit request.

**Postconditions:**
- Return request submitted.

---

## UC-CUS-06: Track Orders

**Primary Actor:** Customer

**Goal:**
Track delivery status.

**Main Flow:**
1. Open My Orders.
2. Select order.
3. View tracking information.

**Postconditions:**
- Current order status displayed. 


# 12. Assumptions

The following assumptions have been made during the preparation of this Software Requirements Specification (SRS). These assumptions are considered valid unless otherwise communicated by the client.

---

## AS-1 Marketplace Ownership

The marketplace is owned and operated by a single Super Admin who is responsible for managing the complete platform.

---

## AS-2 Seller Types

The platform supports both Individual and Business sellers.

---

## AS-3 Seller Verification

Every seller must successfully complete the verification process before selling any products on the marketplace.

---

## AS-4 Category Approval

A seller may sell products only within categories approved by the Super Admin.

Approval of one category does not imply approval of any other category.

---

## AS-5 Product Ownership

Each seller owns and manages only their own products.

The Super Admin manages only their own products and cannot directly modify products belonging to other sellers.

---

## AS-6 Order Ownership

Customers may purchase products from multiple sellers within a single checkout.

Internally, the system shall maintain seller-specific order records for order processing and settlement.

---

## AS-7 Payment Ownership

All customer payments are received by the marketplace.

The marketplace is responsible for calculating commissions, managing settlements, and processing refunds.

---

## AS-8 Settlement

Seller payments are not transferred immediately after a purchase.

Seller earnings remain on hold until the settlement process is completed according to the marketplace policy.

---

## AS-9 Returns & Refunds

Refunds are processed only after the returned product has been successfully verified according to the marketplace return policy.

---

## AS-10 Notifications

The platform provides notifications for important marketplace events such as approvals, rejections, settlements, refunds, and order updates.

---

## AS-11 Future Expansion

The platform is expected to evolve over time by introducing additional marketplace features without requiring a complete system redesign.

Examples include:

- Coupons
- Wishlist
- Seller Subscription Plans
- Product Variants
- Bulk Product Upload
- Customer-Seller Chat
- Promotional Campaigns
- Featured Products

---

## AS-12 Internet Connectivity

All users are assumed to have a stable internet connection while interacting with the platform.

---

## AS-13 User Responsibility

Users are responsible for maintaining accurate account information and keeping their login credentials secure.

---

## AS-14 Legal Compliance

Sellers are responsible for ensuring that the products they sell comply with applicable laws and regulations.

The marketplace facilitates transactions but does not assume ownership of seller-listed products. 


# 13. Constraints

The following constraints define the limitations and boundaries within which the system shall be designed and implemented.

---

## C-1 Budget Constraint

The initial version of the marketplace shall prioritize the use of free or open-source technologies wherever feasible to minimize development and operational costs.

---

## C-2 Marketplace Model

The platform shall operate as a multi-vendor marketplace where all customer payments are processed through the marketplace before seller settlement.

Direct customer-to-seller payments are outside the scope of Version 1.

---

## C-3 Seller Approval

Only approved sellers are permitted to sell products on the platform.

---

## C-4 Category Restriction

Sellers may create products only within categories approved for their accounts.

---

## C-5 Administrative Authority

Only the Super Admin may:

- Verify sellers
- Approve seller categories
- Configure commissions
- Process settlements
- Approve refunds

---

## C-6 Product Ownership

Sellers cannot modify products belonging to other sellers.

The Super Admin cannot directly edit seller-owned products.

---

## C-7 Authentication

Customers must be authenticated before performing protected actions such as placing orders, requesting returns, or managing their accounts.

---

## C-8 Financial Records

Completed financial transactions, settlements, commissions, and refunds must remain historically accurate and traceable.

Historical financial records shall not be modified.

---

## C-9 Business Rules

All marketplace operations must comply with the business rules defined in this SRS.

No module shall bypass these rules.

---

## C-10 Future Compatibility

The system shall be designed so that future features can be integrated without requiring significant redesign of existing modules. 



# 14. Risks

The following risks have been identified during the planning and design phase of the Multi-Vendor Marketplace. Appropriate mitigation strategies should be considered during implementation.

---

## R-1 Fake Seller Verification

**Description:**
A seller may submit fake or forged verification documents.

**Impact:**
High

**Mitigation:**
The Super Admin shall manually verify all submitted documents before approving the seller.

---

## R-2 Fraudulent Product Listings

**Description:**
A seller may upload prohibited, counterfeit, or misleading products.

**Impact:**
High

**Mitigation:**
The Super Admin shall have the authority to suspend sellers, revoke category permissions, or remove violating products according to marketplace policies.

---

## R-3 Payment Failure

**Description:**
Customer payments may fail or remain incomplete due to external payment gateway issues.

**Impact:**
High

**Mitigation:**
Orders shall only be created after successful payment confirmation.

---

## R-4 Settlement Errors

**Description:**
Incorrect settlement calculations may result in incorrect seller payouts.

**Impact:**
High

**Mitigation:**
Settlement calculations shall be based on immutable order, commission, and refund records.

---

## R-5 Return & Refund Fraud

**Description:**
Customers may attempt to misuse the return and refund process.

**Impact:**
Medium

**Mitigation:**
Refunds shall only be processed after successful return verification and approval.

---

## R-6 Data Loss

**Description:**
Unexpected failures may lead to loss of marketplace data.

**Impact:**
High

**Mitigation:**
Regular backups and recovery procedures shall be maintained.

---

## R-7 Unauthorized Access

**Description:**
Unauthorized users may attempt to access protected resources.

**Impact:**
High

**Mitigation:**
Authentication, authorization, and audit logging shall be enforced throughout the platform.

---

## R-8 Scope Creep

**Description:**
New requirements may be introduced during development without proper planning.

**Impact:**
Medium

**Mitigation:**
All new requirements shall be reviewed, documented, and approved before implementation.


# 15. Success Metrics

The success of Version 1 of the Multi-Vendor Marketplace shall be measured using the following criteria.

---

## Business Success

- Sellers can successfully register and complete verification.
- Sellers can manage products independently.
- Customers can browse and purchase products successfully.
- Orders are processed without data inconsistencies.
- Weekly settlements are completed successfully.
- Refunds are processed correctly.
- Commission calculations remain accurate.

---

## System Success

- Stable system performance during normal operation.
- Secure authentication and authorization.
- Reliable data integrity.
- Accurate reporting.
- Consistent notification delivery.
- Successful audit logging.

---

## User Success

### Super Admin

- Can efficiently manage marketplace operations.
- Can verify sellers and categories.
- Can monitor business performance.
- Can manage settlements without manual calculation errors.

### Seller

- Can easily manage products and inventory.
- Can track orders.
- Can monitor settlements and reports.

### Customer

- Can easily discover products.
- Can complete purchases successfully.
- Can track orders.
- Can request returns and receive refunds.


# 16. Out of Scope (Version 1)

The following features are intentionally excluded from Version 1 of the marketplace and may be considered for future releases.

- Mobile Applications (Android & iOS)
- Multi-language Support
- AI Product Recommendations
- Loyalty Program
- Reward Points
- Live Customer Support
- Customer-Seller Live Chat
- Affiliate Marketing
- Multi-Currency Support
- Multi-Warehouse Management
- Automated Tax Calculation
- Automated Shipping Provider Integration
- Automated Settlement Processing
- Seller Subscription Billing
- Advanced Recommendation Engine 


# 17. Future Scope

The marketplace has been designed to support future enhancements without significant architectural changes.

Potential future features include:

- Coupons & Discount Campaigns
- Wishlist
- Product Reviews & Ratings
- Seller Subscription Plans
- Promotional Banners
- Featured Products
- Product Variants Enhancement
- Digital Product Selling
- Bulk Product Upload (CSV/Excel)
- Customer-Seller Chat
- Advanced Analytics
- AI-Based Product Recommendations
- Automated Shipping Integration
- Automated Settlement Processing
- Mobile Applications
- Multi-language Support
- Multi-Currency Support


# 18. Acceptance Criteria

The Multi-Vendor Marketplace shall be considered acceptable for Version 1.0 when all of the following criteria are successfully satisfied.

---

## AC-1 Seller Management

- Sellers can register as an Individual or Business.
- Sellers can upload all required verification documents.
- Sellers can resubmit rejected verification documents.
- Super Admin can approve, reject, suspend, or block sellers.
- Sellers can log in only after approval.

---

## AC-2 Category Management

- Sellers can request one or more selling categories.
- Super Admin can approve or reject category requests.
- Sellers can sell products only within approved categories.
- Super Admin can revoke seller category permissions.

---

## AC-3 Product Management

- Sellers can create products.
- Sellers can edit their own products.
- Sellers can delete their own products.
- Sellers can pause or hide products.
- Sellers can duplicate products.
- Products support images. Product variants are future scope and are excluded from Version 1.
- Products automatically become Out of Stock when inventory reaches zero.

---

## AC-4 Customer Experience

- Customers can browse products without logging in.
- Customers must log in before placing an order.
- Customers can search and filter products.
- Customers can purchase products from multiple sellers in a single checkout.
- Customers can track their orders.
- Customers can cancel eligible products.
- Customers can request returns.

---

## AC-5 Order Management

- Orders are successfully created after payment.
- Orders are internally split seller-wise.
- Sellers can view only their assigned order items.
- Order status updates are accurately reflected.

---

## AC-6 Payment & Settlement

- Customer payments are received by the marketplace.
- Commission is calculated correctly.
- Seller settlements are generated accurately.
- Super Admin can complete manual settlements.
- Settlement reports are available for sellers.

---

## AC-7 Refund Management

- Customers can submit return requests.
- Super Admin can approve or reject return requests.
- Refunds are processed only after successful return verification.
- Refund history is maintained.

---

## AC-8 Notifications

Notifications are generated for:

- Seller approval
- Seller rejection
- Category approval
- Category rejection
- Order placement
- Order cancellation
- Refund completion
- Settlement completion

---

## AC-9 Reporting

The system generates reports for:

- Sales
- Revenue
- Commission
- Settlements
- Sellers
- Products
- Low Stock
- Pending Verifications

---

## AC-10 System Quality

The platform satisfies all approved Functional Requirements, Non-Functional Requirements, and Business Rules defined in this SRS.  



# 19. Glossary

The following glossary defines important business terms used throughout this Software Requirements Specification.

| Term | Definition |
|------|------------|
| Super Admin | The marketplace owner who manages the complete platform and can also sell products. |
| Seller | An Individual or Business approved by the Super Admin to sell products on the marketplace. |
| Customer | A registered user who purchases products from the marketplace. |
| Category | A product classification that determines what type of products a seller is permitted to sell. |
| Subcategory | A subdivision of a parent category used to organize products more effectively. |
| Product | An item listed for sale by a seller or the Super Admin. |
| Product Variant | A variation of a product based on attributes such as size, color, or other options. |
| Commission | The percentage deducted by the marketplace from a seller's sale. |
| Order | A customer's purchase transaction containing one or more products. |
| Order Item | A single product within an order. |
| Cart | A temporary collection of products selected for purchase. |
| Checkout | The process through which a customer confirms an order and completes payment. |
| Inventory | The available stock quantity of a product. |
| Settlement | The transfer of a seller's earnings by the marketplace after deducting commissions and considering applicable business rules. |
| Refund | The return of money to a customer after an approved return request. |
| Return | The process through which a customer sends a purchased product back to the seller according to the marketplace policy. |
| Verification | The process of reviewing seller documents before allowing them to sell products. |
| Notification | A system-generated message informing users about important events. |
| Dashboard | The main interface through which a user manages their activities within the platform. |
| Marketplace | The complete Multi-Vendor E-commerce Platform described in this document. |

