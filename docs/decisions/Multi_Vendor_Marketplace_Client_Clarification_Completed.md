Multi-Vendor Marketplace
Client Clarification & Confirmed Requirements
Project: Multi-Vendor Marketplace
Version: 1.0
Status: Client Decisions Consolidated
Important note: The supplied questionnaire contains 123 requirement questions across 15 sections (plus a Section 16 approval/sign-off block). This document records the decisions made in the conversation, including accepted defaults and explicit recommendations.
## 1. Product Scope

| ID | Question | Final Client Decision |
| --- | --- | --- |
| SCOPE-01 | Is Version 1 a web-only marketplace? | Yes. Android/iOS apps remain future scope. |
| SCOPE-02 | Which countries and regions will the marketplace serve? | India initially. |
| SCOPE-03 | Which currency should be used? | INR only for Version 1. |
| SCOPE-04 | Is multi-language support required in Version 1? | No. |
| SCOPE-05 | Is multi-currency support required in Version 1? | No. |
| SCOPE-06 | Which product categories are expected at launch? | Admin-created categories and subcategories. |
| SCOPE-07 | Are coupons, wishlists, reviews, chat, subscriptions, and recommendations excluded from Version 1? | Yes. |

## 2. Users, Roles, and Accounts

| ID | Question | Final Client Decision |
| --- | --- | --- |
| USER-01 | Can one User have both Customer and Seller capabilities? | Yes, but through separate accounts: one account may be Customer and another account may be Seller; the same single account will not hold both capabilities. |
| USER-02 | Can the Super Admin sell products? | Yes. The Super Admin must also be able to sell their own production independently, using the approved Admin-owned seller identity/model. |
| USER-03 | How many Super Admin accounts are required? | One initial Super Admin, with support for additional Admin accounts later. |
| USER-04 | Is email verification required during registration? | Yes. The user must verify email before account activation. |
| USER-05 | Is mobile OTP verification required? | No for Version 1 unless legally or operationally required. |
| USER-06 | What are the exact account statuses and allowed transitions? | Pending → Active → Suspended / Blocked / Inactive. Rejected may apply depending on account type. If a seller is rejected, they may modify and resubmit documents. If the seller account is Blocked, that account cannot re-upload documents. |
| USER-07 | Should users be able to permanently delete their accounts? | No. Deactivate/anonymize the account while preserving required business records such as orders and payments. |
| USER-08 | What password policy is required? | Use a reasonable default. |

## 3. Seller Onboarding and Verification

| ID | Question | Final Client Decision |
| --- | --- | --- |
| SELLER-01 | Which seller documents are mandatory for Individuals? | Default. |
| SELLER-02 | Which seller documents are mandatory for Businesses? | Default. |
| SELLER-03 | Is GST mandatory for every Business seller? | Default: No; required only when legally/business-policy applicable. |
| SELLER-04 | Does the marketplace perform external Aadhaar/PAN verification or only manual review? | Default: Manual Admin review in Version 1. |
| SELLER-05 | Can a rejected seller resubmit documents? | Default: Yes, with rejection reason retained in history. |
| SELLER-06 | Who can approve, reject, suspend, or block sellers? | Default: Super Admin only. |
| SELLER-07 | Can approved sellers edit verification-sensitive information? | Default: Yes, but changes trigger re-verification where necessary. |
| SELLER-08 | What seller information is visible to customers? | Default: Public seller name/profile only; no documents, private address, or financial data. |
| SELLER-09 | Is seller pickup/return address required before approval or before first product listing? | Client selected Option A (as selected in the original questionnaire; the exact Option A wording is not present in the supplied source text). |

## 4. Categories and Commissions

| ID | Question | Final Client Decision |
| --- | --- | --- |
| CAT-01 | Who owns category creation and modification? | Super Admin through Category Management. |
| CAT-02 | Can sellers request multiple categories in one request? | Yes, but each category receives an independent decision. |
| CAT-03 | Can the Admin revoke a seller's category permission? | Yes, effective for future operations only. |
| CAT-04 | Can sellers create marketplace categories? | No. |
| CAT-05 | Can products belong to multiple categories in Version 1? | No; one category per product. |
| CAT-06 | What is the commission range and precision? | 0–100%, with 2 decimal places. |
| CAT-07 | When does a commission change become effective? | At a specified timestamp and for future orders only. |
| CAT-08 | Is commission calculated on product price before or after discount, tax, and shipping? | Default/recommended basis accepted: commission is calculated after discount and before tax and shipping. |
| CAT-09 | Does every category require a commission before products can be listed? | Yes. |

## 5. Products and Catalog

| ID | Question | Final Client Decision |
| --- | --- | --- |
| PROD-01 | Are product variants required in Version 1? | No product variants in Version 1. Each product has its own SKU, price, and inventory; variants may be considered in a future version. |
| PROD-02 | Is product approval required after seller/category approval? | No. |
| PROD-03 | Which product statuses are required? | Active, Paused, Hidden, Deleted. |
| PROD-04 | Who can manage Super Admin-owned products? | Super Admin only. |
| PROD-05 | Can sellers change a product's category after creation? | Yes, only to a category currently approved for that seller. |
| PROD-06 | What makes SKU unique? | Globally unique SKU across the marketplace. |
| PROD-07 | How many images and what file types/sizes are allowed? | Default. |
| PROD-08 | What product specifications are required? | Flexible key/value specifications with defined validation. |
| PROD-09 | What happens to products when a seller is suspended or blocked? | They become unavailable for new purchases according to Admin policy. |
| PROD-10 | What happens to products when category permission is revoked? | Existing history remains valid; future listing/purchase behavior follows the approved policy. |

## 6. Inventory and Shipping

| ID | Question | Final Client Decision |
| --- | --- | --- |
| INV-01 | Is inventory tracked per product or per variant? | Per product until variants are introduced. |
| INV-02 | Should stock be reserved when added to cart or only at checkout? | Reserve during checkout/payment workflow, not ordinary cart addition. |
| INV-03 | What should happen when payment fails after stock reservation? | Release the reservation automatically after expiry/failure. |
| INV-04 | Are negative stock quantities ever allowed? | No. |
| INV-05 | Is low-stock threshold configurable per product? | Default. |
| INV-06 | Is shipping handled manually in Version 1? | Yes; automated shipping-provider integration is future scope. |
| INV-07 | What order statuses are required for fulfillment? | Pending, Confirmed, Processing, Shipped, Delivered, Cancelled, Returned, Refunded. |
| INV-08 | Is tracking number entry required? | Default. |
| INV-09 | Can one customer order contain multiple shipments? | Yes, grouped by seller/order item. |

## 7. Customer Addresses and Cart

| ID | Question | Final Client Decision |
| --- | --- | --- |
| CART-01 | Must customers log in before adding items to cart? | Yes. |
| CART-02 | Can one cart contain products from multiple sellers? | Yes. |
| CART-03 | Should carts persist across sessions/devices? | Yes for authenticated customers. |
| CART-04 | What address types are required? | Home, business, and shipping address. |
| CART-05 | Can a customer edit/delete an address used by a historical order? | Deactivate it while preserving the order snapshot. |
| CART-06 | Should price changes be shown as a warning during checkout? | Yes; require customer confirmation or refreshed checkout. |
| CART-07 | Should out-of-stock cart items remain visible? | Yes, but checkout must block them and explain why. |

## 8. Checkout, Orders, and Cancellation

| ID | Question | Final Client Decision |
| --- | --- | --- |
| ORDER-01 | Should multi-seller checkout create one customer-facing order? | Yes. |
| ORDER-02 | How should seller-wise order processing be represented? | One Order with Order Items grouped by Seller ID in Version 1. |
| ORDER-03 | Is a separate seller sub-order entity required? | No for Version 1 unless seller workflows later require independent numbers/statuses. |
| ORDER-04 | When is an Order created? | After authoritative successful payment confirmation. |
| ORDER-05 | Can customers cancel a complete order? | Yes, when eligible. |
| ORDER-06 | Can customers cancel individual order items? | Yes, when eligible. |
| ORDER-07 | Which order states allow cancellation? | Before shipment. |
| ORDER-08 | Is partial cancellation supported for multi-seller orders? | Yes. |
| ORDER-09 | What information must be captured for shipment tracking? | Default/recommended tracking fields: carrier, tracking number, dispatch date, delivery date, and proof of delivery. |
| ORDER-10 | What idempotency behavior is required for checkout/order creation? | Required; duplicate requests must not create duplicate orders or payments. |

## 9. Payments

| ID | Question | Final Client Decision |
| --- | --- | --- |
| PAY-01 | Which payment gateway will be used? | Razorpay. |
| PAY-02 | Which payment methods are supported? | All supported Razorpay methods except Cash on Delivery. |
| PAY-03 | Is Cash on Delivery supported? | No. |
| PAY-04 | What is the authoritative payment confirmation method? | Verified Razorpay webhook/server confirmation. |
| PAY-05 | What happens when payment succeeds but order creation fails? | Reconciliation workflow with retry/compensation. |
| PAY-06 | Are partial payments or split payments supported? | No. One payment per customer checkout. |
| PAY-07 | Should payment credentials ever be stored? | No; store provider references only. |
| PAY-08 | What payment timeout and retry policy is required? | Payment attempt expires after 15 minutes; maximum 3 attempts for the same checkout. After the limit, the payment is failed and a new checkout/payment flow is required. |

## 10. Returns and Refunds

| ID | Question | Final Client Decision |
| --- | --- | --- |
| REF-01 | What is the return window? | 5 days after delivery. |
| REF-02 | Which products are non-returnable? | All products are returnable/refundable; no product category is excluded. |
| REF-03 | Who approves returns/refunds? | Super Admin. |
| REF-04 | Is physical return verification required before refund? | Yes. |
| REF-05 | Are partial refunds supported? | Yes. |
| REF-06 | Are cancellation refunds different from return refunds? | Yes. Cancellation refunds and post-delivery return refunds have different rules/timing. |
| REF-07 | Is shipping refunded? | Shipping charges are partially refunded. |
| REF-08 | How are discounts and taxes handled in refunds? | Refund the actual discounted amount paid for the returned/cancelled item; applicable tax is refunded proportionally. The discount is not refunded separately. Shipping follows the partial-refund policy. Corresponding seller commission is reversed/adjusted. |
| REF-09 | Can sellers approve or reject returns? | No. Super Admin controls approval; sellers may provide evidence/comments. |
| REF-10 | How is returned inventory handled? | Restock only after inspection and acceptance. |

## 11. Settlements and Seller Payouts

| ID | Question | Final Client Decision |
| --- | --- | --- |
| SET-01 | Are settlements weekly? | Yes. |
| SET-02 | What is the exact holding period after delivery? | 7 days after delivery. |
| SET-03 | Which statuses make an Order Item settlement-eligible? | Delivered + 7-day holding period completed + no blocking return/refund. |
| SET-04 | Who initiates settlements? | Super Admin manually. |
| SET-05 | Will Version 1 use manual payout recording or a payout provider? | Manual payout recording. |
| SET-06 | How are refunds after settlement handled? | Normal returns/refunds must be resolved before seller settlement. Because the return window is 5 days and settlement eligibility is after 7 days, normal return refunds occur before settlement. Exceptional post-settlement financial adjustments require Super Admin intervention. |
| SET-07 | What seller payout details are required? | Account holder name, bank account number, IFSC code, bank name, account type, and optional UPI ID. Payout details require Super Admin verification before settlement. |
| SET-08 | Can settlement records be edited after completion? | No. |
| SET-09 | Is a minimum payout threshold required? | No. |
| SET-10 | What currency and rounding rules apply? | INR with 2 decimal places. |

## 12. Notifications

| ID | Question | Final Client Decision |
| --- | --- | --- |
| NOTIF-01 | Which delivery channels are required? | In-app and email. |
| NOTIF-02 | Are SMS or push notifications required? | No; future scope. |
| NOTIF-03 | Which events require notifications? | Seller decisions, category decisions, order events, return/refund events, and settlement completion. |
| NOTIF-04 | Should notification delivery failure affect the business transaction? | No; record failure and retry. |
| NOTIF-05 | Can users configure notification preferences? | Yes, but only for optional/non-critical notifications. Mandatory transactional notifications (payment, order, shipping, delivery, return/refund, seller/category decisions, settlement) cannot be disabled. |

## 13. Reports and Administration

| ID | Question | Final Client Decision |
| --- | --- | --- |
| ADMIN-01 | Which reports are required at launch? | Sales, revenue, commission, settlements, sellers, products, inventory, and pending verification. |
| ADMIN-02 | Should sellers receive sales/product analytics? | Yes in Version 1. |
| ADMIN-03 | Which Admin actions require audit records? | Seller/category decisions, commission changes, refunds, settlements, permissions, and order status changes. |
| ADMIN-04 | How long must audit and financial records be retained? | 7 years. |
| ADMIN-05 | Are reports downloadable? | Yes, in both CSV and PDF formats. |
| ADMIN-06 | Are multiple Admin permission levels required? | No; one Super Admin role in Version 1. |

## 14. Security, Compliance, and Operations

| ID | Question | Final Client Decision |
| --- | --- | --- |
| SEC-01 | What data retention period applies to seller documents? | 7 years after seller account closure, unless applicable law or an active legal/business requirement requires longer; then securely delete the documents. |
| SEC-02 | Who can view Aadhaar, PAN, and verification documents? | Authorized Super Admin only. |
| SEC-03 | Are document downloads logged? | Yes. |
| SEC-04 | What backup frequency and recovery target are required? | RPO: 1 hour. RTO: 4 hours. Recommended backup approach: daily full backups, more frequent incremental/transactional backups, encrypted backups, separate backup copy, and regular restoration testing. |
| SEC-05 | What uptime target is required? | 99.9% monthly uptime, excluding explicitly defined planned maintenance. |
| SEC-06 | What rate limits are required for login, reset, payment, and public APIs? | Configurable starting limits: Login 5 failed attempts/15 min per account/IP; password reset 3 requests/hour per account/IP; payment 5 attempts/15 min per customer; public API 100 requests/min per IP; authenticated API 300 requests/min per user. |
| SEC-07 | Which legal/privacy requirements apply? | Design for applicable Indian data-protection/privacy, taxation, consumer-protection, e-commerce, and payment/financial requirements. Final legal, tax, compliance, retention, consent, KYC and related obligations must be validated by the appropriate professional before production launch. |
| SEC-08 | Is tax calculation manual or automated? | Manual/configurable in Version 1; automated tax integration is out of scope. |

## 15. Deployment and Integrations

| ID | Question | Final Client Decision |
| --- | --- | --- |
| DEP-01 | Which hosting/cloud provider will be used? | AWS as the primary cloud/hosting provider. |
| DEP-02 | Which file storage provider will be used? | Amazon S3 for object storage; seller verification documents use private, access-controlled storage. |
| DEP-03 | Which email provider will be used? | Amazon SES for transactional email delivery. |
| DEP-04 | Is a separate search service required at launch? | No; database-backed search initially. |
| DEP-05 | Is a background job/worker required at launch? | Yes; for notifications, reports, cleanup, retries, and other non-immediate tasks. |
| DEP-06 | Is automated shipping integration required? | No for Version 1; future scope. |
| DEP-07 | Is automated seller payout integration required? | No for Version 1; manual payout recording. |

## Cross-Section Business Rules Confirmed
Customer payments are received by the marketplace/Super Admin payment account first; sellers are settled later.
Marketplace commission is retained from the seller's settlement. Example: a ₹10,000 sale with a 10% commission results in ₹9,000 seller settlement and ₹1,000 marketplace commission.
The normal customer return window is 5 days after delivery.
Seller settlement eligibility occurs after delivery plus a 7-day holding period and only when there is no blocking return/refund.
Because the return window (5 days) ends before settlement eligibility (7 days), normal return refunds are resolved before seller settlement.
Exceptional post-settlement financial adjustments require Super Admin intervention.
No product variants are included in Version 1; inventory is tracked per product.
A multi-seller cart creates one customer-facing order with Order Items associated with Seller IDs.
Razorpay webhook/server confirmation is authoritative for payment confirmation; duplicate checkout/payment requests must be idempotent.
Seller verification documents are private and accessible only to authorized Super Admin users; document downloads are audited.
Version 1 uses manual seller payout recording and manual shipping handling.
## Section 16 — Approval
By approving this document, the client confirms that the answers represent the intended Version 1 marketplace behavior. Any later changes may affect database design, API contracts, UI, estimates, timelines, and implementation.
Client Name: ______________________________________________________________________
Signature: ______________________________________________________________________
Date: ______________________________________________________________________
Product/Engineering Representative: ______________________________________________________________________
Signature: ______________________________________________________________________
Date: ______________________________________________________________________