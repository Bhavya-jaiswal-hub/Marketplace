# Multi-Vendor Marketplace
## Client Clarification Questionnaire

**Project:** Multi-Vendor Marketplace  
**Version:** 1.0  
**Status:** Awaiting Client Confirmation  
**Purpose:** Capture the business and technical decisions required before finalizing the database, APIs, feature specifications, UI, and implementation.

---

## How To Use This Document

Please answer each question using the response space provided. Where a recommended default is shown, the development team will use it for Version 1 unless the client requests a different behavior.

Decisions marked **Blocking** affect the database model or financial workflows and must be confirmed before implementation of the affected module.

---

# 1. Product Scope

| ID | Priority | Question | Recommended Version 1 Default | Client Decision |
|---|---|---|---|---|
| SCOPE-01 | Blocking | Is Version 1 a web-only marketplace? | Yes. Android/iOS apps remain future scope. | |
| SCOPE-02 | Blocking | Which countries and regions will the marketplace serve? | India initially. | |
| SCOPE-03 | Blocking | Which currency should be used? | INR only for Version 1. | |
| SCOPE-04 | Blocking | Is multi-language support required in Version 1? | No. | |
| SCOPE-05 | Blocking | Is multi-currency support required in Version 1? | No. | |
| SCOPE-06 | Important | Which product categories are expected at launch? | Admin-created categories and subcategories. | |
| SCOPE-07 | Important | Are coupons, wishlists, reviews, chat, subscriptions, and recommendations excluded from Version 1? | Yes. | |

# 2. Users, Roles, and Accounts

| ID | Priority | Question | Recommended Version 1 Default | Client Decision |
|---|---|---|---|---|
| USER-01 | Blocking | Can one User have both Customer and Seller capabilities? | Yes, through separate Customer Profile and Seller Profile records. | |
| USER-02 | Blocking | Can the Super Admin sell products? | Yes, using an Admin-owned seller identity or equivalent approved model. | |
| USER-03 | Blocking | How many Super Admin accounts are required? | One initial Super Admin, with support for additional Admin accounts later. | |
| USER-04 | Important | Is email verification required during registration? | Confirm whether email verification is required before account activation. | |
| USER-05 | Important | Is mobile OTP verification required? | No for Version 1 unless legally or operationally required. | |
| USER-06 | Blocking | What are the exact account statuses and allowed transitions? | Pending, Active, Rejected, Suspended, Blocked, Inactive as applicable by account type. | |
| USER-07 | Important | Should users be able to permanently delete their accounts? | No; deactivate/anonymize while preserving required business records. | |
| USER-08 | Important | What password policy is required? | Minimum length, mixed character rules, reset expiry, and failed-login limits must be specified. | |

# 3. Seller Onboarding and Verification

| ID | Priority | Question | Recommended Version 1 Default | Client Decision |
|---|---|---|---|---|
| SELLER-01 | Blocking | Which seller documents are mandatory for Individuals? | Aadhaar, PAN, photograph, and address proof/details. | |
| SELLER-02 | Blocking | Which seller documents are mandatory for Businesses? | PAN, business registration/GST where applicable, authorized-person identity, photograph, and address. | |
| SELLER-03 | Blocking | Is GST mandatory for every Business seller? | No; required only when legally/business-policy applicable. | |
| SELLER-04 | Important | Does the marketplace perform external Aadhaar/PAN verification or only manual review? | Manual Admin review in Version 1. | |
| SELLER-05 | Blocking | Can a rejected seller resubmit documents? | Yes, with rejection reason retained in history. | |
| SELLER-06 | Blocking | Who can approve, reject, suspend, or block sellers? | Super Admin only. | |
| SELLER-07 | Important | Can approved sellers edit verification-sensitive information? | Yes, but changes trigger re-verification where necessary. | |
| SELLER-08 | Important | What seller information is visible to customers? | Public seller name/profile only; no documents, private address, or financial data. | |
| SELLER-09 | Important | Is seller pickup/return address required before approval or before first product listing? | Confirm required timing. | |

# 4. Categories and Commissions

| ID | Priority | Question | Recommended Version 1 Default | Client Decision |
|---|---|---|---|---|
| CAT-01 | Blocking | Who owns category creation and modification? | Super Admin through Category Management. | |
| CAT-02 | Blocking | Can sellers request multiple categories in one request? | Yes, but each category receives an independent decision. | |
| CAT-03 | Blocking | Can the Admin revoke a seller's category permission? | Yes, effective for future operations only. | |
| CAT-04 | Blocking | Can sellers create marketplace categories? | No. | |
| CAT-05 | Blocking | Can products belong to multiple categories in Version 1? | Recommended: no; one category per product based on the current entity model. | |
| CAT-06 | Blocking | What is the commission range and precision? | 0% to 100%, with a defined decimal precision. | |
| CAT-07 | Blocking | When does a commission change become effective? | At a specified timestamp and for future orders only. | |
| CAT-08 | Important | Is commission calculated on product price before or after discount, tax, and shipping? | Confirm calculation basis. | |
| CAT-09 | Important | Does every category require a commission before products can be listed? | Yes. | |

# 5. Products and Catalog

| ID | Priority | Question | Recommended Version 1 Default | Client Decision |
|---|---|---|---|---|
| PROD-01 | Blocking | Are product variants required in Version 1? | Recommended: defer until a Product Variant entity is approved. | |
| PROD-02 | Blocking | Is product approval required after seller/category approval? | No. | |
| PROD-03 | Blocking | Which product statuses are required? | Active, Paused, Hidden, Deleted. | |
| PROD-04 | Important | Who can manage Super Admin-owned products? | Super Admin only. | |
| PROD-05 | Blocking | Can sellers change a product's category after creation? | Yes, only to a category currently approved for that seller. | |
| PROD-06 | Important | What makes SKU unique? | Globally unique SKU across the marketplace. | |
| PROD-07 | Important | How many images and what file types/sizes are allowed? | Confirm limits and supported formats. | |
| PROD-08 | Important | What product specifications are required? | Flexible key/value specifications with defined validation. | |
| PROD-09 | Important | What happens to products when a seller is suspended or blocked? | They become unavailable for new purchases according to Admin policy. | |
| PROD-10 | Important | What happens to products when category permission is revoked? | Existing history remains valid; future listing/purchase behavior must be confirmed. | |

# 6. Inventory and Shipping

| ID | Priority | Question | Recommended Version 1 Default | Client Decision |
|---|---|---|---|---|
| INV-01 | Blocking | Is inventory tracked per product or per variant? | Per product until variants are introduced. | |
| INV-02 | Blocking | Should stock be reserved when added to cart or only at checkout? | Reserve during checkout/payment workflow, not ordinary cart addition. | |
| INV-03 | Blocking | What should happen when payment fails after stock reservation? | Release the reservation automatically after expiry/failure. | |
| INV-04 | Important | Are negative stock quantities ever allowed? | No. | |
| INV-05 | Important | Is low-stock threshold configurable per product? | Confirm whether required. | |
| INV-06 | Blocking | Is shipping handled manually in Version 1? | Yes; automated shipping-provider integration is future scope. | |
| INV-07 | Blocking | What order statuses are required for fulfillment? | Pending, Confirmed, Processing, Shipped, Delivered, Cancelled, Returned, Refunded. | |
| INV-08 | Important | Is tracking number entry required? | Confirm required shipping fields. | |
| INV-09 | Important | Can one customer order contain multiple shipments? | Recommended: yes, grouped by seller/order item. | |

# 7. Customer Addresses and Cart

| ID | Priority | Question | Recommended Version 1 Default | Client Decision |
|---|---|---|---|---|
| CART-01 | Blocking | Must customers log in before adding items to cart? | Yes, according to the SRS. | |
| CART-02 | Blocking | Can one cart contain products from multiple sellers? | Yes. | |
| CART-03 | Blocking | Should carts persist across sessions/devices? | Yes for authenticated customers. | |
| CART-04 | Blocking | What address types are required? | Home, business, and shipping address. | |
| CART-05 | Blocking | Can a customer edit/delete an address used by a historical order? | Deactivate it while preserving the order snapshot. | |
| CART-06 | Important | Should price changes be shown as a warning during checkout? | Yes; require customer confirmation or refreshed checkout. | |
| CART-07 | Important | Should out-of-stock cart items remain visible? | Yes, but checkout must block them and explain why. | |

# 8. Checkout, Orders, and Cancellation

| ID | Priority | Question | Recommended Version 1 Default | Client Decision |
|---|---|---|---|---|
| ORDER-01 | Blocking | Should multi-seller checkout create one customer-facing order? | Yes. | |
| ORDER-02 | Blocking | How should seller-wise order processing be represented? | One Order with Order Items grouped by Seller ID in Version 1. | |
| ORDER-03 | Blocking | Is a separate seller sub-order entity required? | Recommended: no for Version 1 unless seller workflows require independent numbers/statuses. | |
| ORDER-04 | Blocking | When is an Order created? | After authoritative successful payment confirmation. | |
| ORDER-05 | Blocking | Can customers cancel a complete order? | Yes, when eligible. | |
| ORDER-06 | Blocking | Can customers cancel individual order items? | Yes, when eligible. | |
| ORDER-07 | Important | Which order states allow cancellation? | Confirm exact cutoff, recommended before shipment. | |
| ORDER-08 | Important | Is partial cancellation supported for multi-seller orders? | Yes. | |
| ORDER-09 | Important | What information must be captured for shipment tracking? | Confirm carrier, tracking number, dispatch date, delivery date, and proof of delivery requirements. | |
| ORDER-10 | Blocking | What idempotency behavior is required for checkout/order creation? | Required; duplicate requests must not create duplicate orders or payments. | |

# 9. Payments

| ID | Priority | Question | Recommended Version 1 Default | Client Decision |
|---|---|---|---|---|
| PAY-01 | Blocking | Which payment gateway will be used? | Confirm provider and supported environment. | |
| PAY-02 | Blocking | Which payment methods are supported? | Confirm cards, UPI, net banking, wallets, COD, etc. | |
| PAY-03 | Blocking | Is Cash on Delivery supported? | Recommended: no unless explicitly required. | |
| PAY-04 | Blocking | What is the authoritative payment confirmation method? | Verified gateway webhook/server confirmation. | |
| PAY-05 | Blocking | What happens when payment succeeds but order creation fails? | Reconciliation workflow with retry/compensation is required. | |
| PAY-06 | Important | Are partial payments or split payments supported? | No. One payment per customer checkout. | |
| PAY-07 | Blocking | Should payment credentials ever be stored? | No; store provider references only. | |
| PAY-08 | Important | What payment timeout and retry policy is required? | Confirm duration and retry limits. | |

# 10. Returns and Refunds

| ID | Priority | Question | Recommended Version 1 Default | Client Decision |
|---|---|---|---|---|
| REF-01 | Blocking | What is the return window? | Confirm number of days after delivery. | |
| REF-02 | Blocking | Which products are non-returnable? | Confirm category/product exclusions. | |
| REF-03 | Blocking | Who approves returns/refunds? | Super Admin. | |
| REF-04 | Blocking | Is physical return verification required before refund? | Yes. | |
| REF-05 | Blocking | Are partial refunds supported? | Entity model supports them; confirm policy. | |
| REF-06 | Blocking | Are cancellation refunds different from return refunds? | Confirm separate rules and timing. | |
| REF-07 | Blocking | Is shipping refunded? | Confirm full/partial/non-refundable shipping policy. | |
| REF-08 | Blocking | How are discounts and taxes handled in refunds? | Confirm calculation rules. | |
| REF-09 | Important | Can sellers approve or reject returns? | Recommended: Admin controls approval; sellers may provide evidence/comments. | |
| REF-10 | Important | How is returned inventory handled? | Restock only after inspection and acceptance. | |

# 11. Settlements and Seller Payouts

| ID | Priority | Question | Recommended Version 1 Default | Client Decision |
|---|---|---|---|---|
| SET-01 | Blocking | Are settlements weekly? | Yes. | |
| SET-02 | Blocking | What is the exact holding period after delivery? | Client must specify the number of days. | |
| SET-03 | Blocking | Which statuses make an Order Item settlement-eligible? | Delivered plus holding period, with no blocking return/refund. | |
| SET-04 | Blocking | Who initiates settlements? | Super Admin manually. | |
| SET-05 | Blocking | Will Version 1 use manual payout recording or a payout provider? | Recommended: manual payout recording. | |
| SET-06 | Blocking | How are refunds after settlement handled? | Confirm deduction from future settlement or seller balance. | |
| SET-07 | Important | What seller payout details are required? | Confirm bank account/UPI fields and verification requirements. | |
| SET-08 | Blocking | Can settlement records be edited after completion? | No. | |
| SET-09 | Important | Is a minimum payout threshold required? | Confirm threshold and rollover behavior. | |
| SET-10 | Important | What currency and rounding rules apply? | INR with defined rounding precision. | |

# 12. Notifications

| ID | Priority | Question | Recommended Version 1 Default | Client Decision |
|---|---|---|---|---|
| NOTIF-01 | Blocking | Which delivery channels are required? | In-app and email. | |
| NOTIF-02 | Important | Are SMS or push notifications required? | Future scope. | |
| NOTIF-03 | Blocking | Which events require notifications? | Seller/category decisions, order events, return/refund events, and settlement completion. | |
| NOTIF-04 | Important | Should notification delivery failure affect the business transaction? | No; record failure and retry. | |
| NOTIF-05 | Important | Can users configure notification preferences? | Confirm whether required in Version 1. | |

# 13. Reports and Administration

| ID | Priority | Question | Recommended Version 1 Default | Client Decision |
|---|---|---|---|---|
| ADMIN-01 | Blocking | Which reports are required at launch? | Sales, revenue, commission, settlements, sellers, products, inventory, and pending verification. | |
| ADMIN-02 | Important | Should sellers receive sales/product analytics? | Confirm seller report scope. | |
| ADMIN-03 | Blocking | Which Admin actions require audit records? | Seller/category decisions, commission changes, refunds, settlements, permissions, and order status changes. | |
| ADMIN-04 | Important | How long must audit and financial records be retained? | Confirm retention period. | |
| ADMIN-05 | Important | Are reports downloadable? | Yes, CSV/PDF requirements must be confirmed. | |
| ADMIN-06 | Important | Are multiple Admin permission levels required? | No; one Super Admin role for Version 1 unless specified otherwise. | |

# 14. Security, Compliance, and Operations

| ID | Priority | Question | Recommended Version 1 Default | Client Decision |
|---|---|---|---|---|
| SEC-01 | Blocking | What data retention period applies to seller documents? | Confirm legal/business retention requirement. | |
| SEC-02 | Blocking | Who can view Aadhaar, PAN, and verification documents? | Authorized Super Admin only. | |
| SEC-03 | Important | Are document downloads logged? | Yes. | |
| SEC-04 | Blocking | What backup frequency and recovery target are required? | Confirm RPO/RTO. | |
| SEC-05 | Important | What uptime target is required? | Confirm target and planned maintenance policy. | |
| SEC-06 | Important | What rate limits are required for login, reset, payment, and public APIs? | Configure according to deployment capacity and abuse risk. | |
| SEC-07 | Blocking | Which legal/privacy requirements apply? | Confirm applicable Indian data protection, tax, consumer, and financial requirements. | |
| SEC-08 | Important | Is tax calculation manual or automated? | Manual/configurable in Version 1; automated tax integration is out of scope. | |

# 15. Deployment and Integrations

| ID | Priority | Question | Recommended Version 1 Default | Client Decision |
|---|---|---|---|---|
| DEP-01 | Blocking | Which hosting/cloud provider will be used? | Confirm deployment target. | |
| DEP-02 | Blocking | Which file storage provider will be used? | Object storage with private document access. | |
| DEP-03 | Blocking | Which email provider will be used? | Confirm provider and sender domain. | |
| DEP-04 | Important | Is a separate search service required at launch? | No; database-backed search initially. | |
| DEP-05 | Important | Is a background job/worker required at launch? | Recommended for notifications, reports, and cleanup. | |
| DEP-06 | Important | Is automated shipping integration required? | No for Version 1. | |
| DEP-07 | Important | Is automated seller payout integration required? | No for Version 1 unless confirmed. | |

# 16. Approval

By approving this document, the client confirms that the answers represent the intended Version 1 marketplace behavior. Any later changes may affect database design, API contracts, UI, estimates, timelines, and implementation.

**Client Name:** ______________________________  
**Signature:** _________________________________  
**Date:** _____________________________________  

**Product/Engineering Representative:** ______________________________  
**Signature:** _________________________________________________  
**Date:** _____________________________________________________
