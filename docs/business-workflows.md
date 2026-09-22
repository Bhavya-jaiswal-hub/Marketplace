# Business Workflows

**Project:** Multi-Vendor Marketplace

**Version:** 1.0

**Status:** Draft

**Owner:** Bhavya Jaiswal

**Last Updated:** YYYY-MM-DD

---

## Purpose 



his document describes the end-to-end business workflows of the Multi-Vendor Marketplace. It defines how different actors (Super Admin, Seller, and Customer) interact with the system from a business perspective. These workflows will serve as the foundation for the Software Requirements Specification (SRS), Module Specifications, Architecture Design, Database Design, API Design, and implementation. 



Workflow 1 – Seller Registration & Verification
Seller registers.
Chooses Individual or Business.
Uploads Aadhaar, PAN, photo, address.
Requests one or more selling categories.
Status becomes Pending.
Admin reviews.
If approved → Seller becomes active.
If rejected → Seller receives rejection reason and can resubmit.


Workflow 2 – Seller Category Approval
Approved seller requests a new category.
Admin reviews the request.
If approved → Seller can list products in that category.
If rejected → Seller cannot sell in that category.


Workflow 3 – Product Management
Seller creates a product.
Product belongs to an approved category.
Seller can edit, pause, hide, duplicate, or delete only their own products.
If stock reaches zero, the product automatically shows "Out of Stock."


Workflow 4 – Customer Shopping
Customer browses products.
Searches and filters products.
Adds products from multiple sellers to the cart.
Proceeds to checkout.
Makes a single payment.


Workflow 5 – Order Processing
Order is created.
Internally split by seller.
Sellers see only their assigned items.
Seller packs and ships products.
Customer tracks the order.


Workflow 6 – Return & Refund
Customer requests a return.
Provides a return reason.
Admin reviews the request.
If approved:
Product is returned.
Refund is processed after the returned item is verified.


Workflow 7 – Settlement
Customer payment is received by the platform.
Funds are held by the platform.
A 7-day holding period begins after delivery.
If no blocking return or refund exists:
Admin settles payment to the seller.
Seller can view settlement history and download reports.


Workflow 8 – Notifications
Seller approval
Seller rejection
Category approval
Category rejection
Order placed
Settlement completed
Refund completed
Workflow 9 – Admin Ope


Workflow 9 – Admin Operations
Verify sellers.
Approve/reject seller categories.
Manage commissions.
Manage reports.
Manage settlements.
Sell own products.
View marketplace analytics.


