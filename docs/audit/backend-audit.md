# Backend Specification & Architecture Audit (SRS v1.2)

**Audit Date:** 2026-10-12  
**Target Subsystem:** NestJS + Fastify + Prisma Backend (`/backend`)  
**Single Source of Truth:** `docs/SRS.md` (v1.2)  
**Supporting Specifications:** `docs/Entities/*`, `docs/api/*`, `docs/database-design.md`, `docs/business-workflows.md`, `docs/architecture.md`, `AGENTS.md`  
**Auditor:** Antigravity AI  

---

## 1. Initial Command Execution Results

All commands were executed sequentially inside `/backend`:

| Command | Status | Result / Exit Code | First Errors & Analysis |
|---|---|---|---|
| `npm ci` | **SUCCESS** | Code 0 | Clean install; 692 packages installed in 33s. 41 npm audit security vulnerabilities flagged (inherited from devDependencies). |
| `npx tsc --noEmit` | **SUCCESS** | Code 0 | Exited with 0 errors (after initial `npx prisma generate` was triggered to populate the local `node_modules/@prisma/client` artifact). Prior to generating the Prisma client, `tsc` reported 165 errors due to ungenerated Prisma models and enum types. |
| `npm run lint` (`eslint "{src,test}/**/*.ts"`) | **FAILED** | Code 1 | **First Error:** `ESLint: 9.39.5 - ESLint couldn't find an eslint.config.(js|mjs|cjs) file.`<br>ESLint v9 requires flat config format (`eslint.config.js`). The repo lacks an `eslint.config.js` root file. |
| `npm run build` (`nest build`) | **SUCCESS** | Code 0 | NestJS production build compiled cleanly to `/dist` without TypeScript or bundler errors. |
| `npm test` (`jest --runInBand`) | **FAILED** | Code 1 | **Suites:** 2 failed, 24 passed, 26 total<br>**Tests:** 2 failed, 119 passed, 121 total<br>**Failing Suites:** `test/auth-flow.integration.spec.ts` & `test/auth.service.spec.ts`. |

### Summary of Failing Tests
1. **`test/auth-flow.integration.spec.ts:199`**:
   - `Expected: "PENDING", Received: "ACTIVE"`
   - `expect(emailService.sendVerificationEmail).toHaveBeenCalledTimes(1);` (failed because auto-activation bypassed email sending).
2. **`test/auth.service.spec.ts:64`**:
   - `Expected message: "Verification instructions have been sent.", Received: "Account registered successfully."`
   - `Expected status: "PENDING", Received: "ACTIVE"`.

---

## 2. Investigation of the 2 Failing Authentication Tests

### 2.1 Code Defect Identification
In `src/auth/auth.service.ts` line 36–37:
```typescript
36: const isCustomer = dto.accountType === 'CUSTOMER';
37: const shouldAutoActivate = isCustomer || process.env.NODE_ENV !== 'production';
```
When `shouldAutoActivate` evaluates to `true`:
- `accountStatus` is set immediately to `AccountStatus.ACTIVE` (line 46).
- `emailVerified` is set to `true` (line 47).
- `sendVerificationEmail` is bypassed entirely (lines 53–55).
- Returns message `'Account registered successfully.'` instead of `'Verification instructions have been sent.'` (line 60).

Because Jest sets `process.env.NODE_ENV = 'test'` (which is `!== 'production'`), **every** registration (both Customer and Seller) auto-activates during testing.

### 2.2 Specification Analysis & Verbatim Citations

1. **`docs/SRS.md` Section 9, FR-1 (Lines 244–249):**
   > "## FR-1 User Authentication & Account Management  
   > The system shall:  
   > - Support customer registration, login, profile management, and password reset.  
   > - Support seller registration with business type selection (Individual or Business).  
   > - Support secure Super Admin authentication with session management.  
   > - Protect all endpoints using role-based authorization guards (`SUPER_ADMIN`, `SELLER`, `CUSTOMER`)."

2. **`docs/SRS.md` Section 10, BR-1 (Lines 462–467):**
   > "### BR-1 Seller Registration & Identity Verification  
   > - Every seller must register as an **Individual** or **Business** and submit mandatory verification documents (Aadhaar, PAN, address proof, photograph, bank account details, and optional GSTIN for Business sellers).  
   > - Seller accounts remain in `Pending Approval` status and cannot list products until approved by the Super Admin.  
   > - Super Admin rejection must include an explicit reason, allowing the seller to resubmit corrected documents.  
   > - Seller account statuses conform strictly to: `Pending Approval`, `Approved`, `Rejected`, `Suspended`, `Blocked`."

3. **`docs/SRS.md` Section 8.6 (Lines 220–226):**
   > "### 8.6 Seller Account Status  
   > - **Pending Approval:** Newly registered seller awaiting Super Admin KYC document verification.  
   > - **Approved:** Verified seller authorized to request categories, list clothing products, and fulfill orders.  
   > - **Rejected:** Verification documents rejected by Super Admin with mandatory feedback (seller may resubmit).  
   > - **Suspended:** Reversible administrative suspension (listings temporarily hidden; seller dashboard restricted).  
   > - **Blocked:** Permanent or indefinite administrative block due to fraud, severe policy violations, or malicious activity (access barred)."

4. **`docs/Entities/01-User.md` (Lines 77–78, 86–95):**
   > "- A Customer is created immediately after registration.  
   > - A Seller remains inactive until verification is approved."  
   > "### Account Status Lifecycle  
   > Possible account statuses:  
   > - Pending  
   > - Active  
   > - Rejected  
   > - Suspended  
   > - Blocked"

5. **`docs/api/authentication.md` Section 4 (Lines 43–52):**
   > "## 4. Account States and Registration  
   > Pending -> Active -> Suspended -> Blocked -> Inactive  
   > - Registration creates a Pending account and sends an email-verification message.  
   > - The account becomes Active only after successful email verification and required account checks."

### 2.3 Verdict: Code vs. Tests
- **The code is WRONG.**  
  Line 37 in `src/auth/auth.service.ts` introduced a non-standard bypass (`shouldAutoActivate = isCustomer || process.env.NODE_ENV !== 'production'`) that violates `docs/api/authentication.md` Section 4 and `docs/Entities/01-User.md`.
- **The tests are CORRECT.**  
  The tests assert the specification: user registration initiates a `PENDING` user account, dispatches an email verification token, and returns `"Verification instructions have been sent."`.

### 2.4 Smallest Fix Proposal
In `src/auth/auth.service.ts`:
1. Remove `shouldAutoActivate` entirely (or set `const shouldAutoActivate = false;`).
2. Always assign `accountStatus: AccountStatus.PENDING`, `emailVerified: false`, `emailVerificationHash: hashToken(verificationToken)`, `emailVerificationExpiresAt: daysFromNow(1)`.
3. Always dispatch `await this.emailService.sendVerificationEmail(user.email, verificationToken, user.fullName)`.
4. Always return `message: 'Verification instructions have been sent.'`.

---

## 3. Database Reality in Integration Tests

All 9 integration tests in `test/*.integration.spec.ts` use **in-memory mocks / fakes**; **NONE** connect to a real PostgreSQL instance:

| Integration Test File | Real DB or In-Memory Mock? | Implementation Details |
|---|---|---|
| `test/auth-flow.integration.spec.ts` | **In-Memory Mock** | Uses private in-memory `mockDb` with `Map` instances (`users`, `roles`, `sessions`, `refreshTokens`, `passwordResetTokens`) injected into a stubbed `PrismaService`. |
| `test/category-flow.integration.spec.ts` | **In-Memory Mock** | Uses in-memory `mockDb` with `Map` instances (`categories`, `categoryCommissions`, `sellerCategories`, `sellers`, `auditLogs`) and mock `$transaction`. |
| `test/checkout-order-payment-flow.integration.spec.ts` | **In-Memory Mock** | Uses in-memory `mockDb` with `Map` instances (`carts`, `cartItems`, `orders`, `orderItems`, `payments`, `paymentTransactions`, `inventory`, `inventoryHistory`, `auditLogs`). |
| `test/customer-cart-flow.integration.spec.ts` | **In-Memory Mock** | Uses in-memory `mockDb` with `Map` instances (`users`, `customerProfiles`, `customerAddresses`, `carts`, `cartItems`, `products`, `auditLogs`). |
| `test/inventory-flow.integration.spec.ts` | **In-Memory Mock** | Uses in-memory `mockDb` with `Map` instances (`inventory`, `inventoryHistory`, `auditLogs`). |
| `test/notification-reporting-flow.integration.spec.ts` | **In-Memory Mock** | Uses in-memory `mockDb` with `Map` instances (`notifications`, `templates`, `orders`, `orderItems`, `refunds`, `sellers`, `products`, `auditLogs`). |
| `test/product-flow.integration.spec.ts` | **In-Memory Mock** | Uses in-memory `mockDb` with `Map` instances (`products`, `images`, `specifications`, `categories`, `sellers`, `auditLogs`). |
| `test/return-refund-settlement-flow.integration.spec.ts` | **In-Memory Mock** | Uses in-memory `mockDb` with `Map` instances (`orders`, `orderItems`, `returnRequests`, `refunds`, `settlements`, `settlementItems`, `payments`, `paymentTransactions`, `inventory`, `auditLogs`). |
| `test/seller-flow.integration.spec.ts` | **In-Memory Mock** | Uses in-memory `mockDb` with `Map` instances (`sellers`, `verifications`, `verificationDocuments`, `addresses`, `auditLogs`). |

**Key Finding:** There are currently **0 real database integration tests**. Database constraints, foreign key cascades, unique indexing, and native PostgreSQL transaction isolation remain untested in automated suites.

---

## 4. Prisma Schema vs. Specifications (Model-by-Model, Field-by-Field)

Comparison of `prisma/schema.prisma` against `docs/Entities/*` and `docs/database-design.md`:

### 4.1 Enums Comparison (SRS Section 8)
- **`OrderItemStatus` (SRS 8.1):**
  - *SRS Permitted:* `Placed`, `Packed`, `Shipped`, `Delivered`, `Cancelled`, `Not Received - Under Dispute` (6 states).
  - *Prisma Enum:* `PENDING`, `CONFIRMED`, `PROCESSING`, `PLACED`, `PACKED`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `NOT_RECEIVED_UNDER_DISPUTE`, `RETURN_REQUESTED`, `RETURNED`, `REFUNDED` (12 states).
  - *Divergence:* Contains 6 extraneous non-spec states (`PENDING`, `CONFIRMED`, `PROCESSING`, `RETURN_REQUESTED`, `RETURNED`, `REFUNDED`).
- **`OrderStatus` / Parent Order (SRS 8.2):**
  - *SRS Permitted:* `Placed`, `Partially Shipped`, `Partially Delivered`, `Delivered`, `Partially Cancelled`, `Cancelled`, `Under Dispute` (7 states).
  - *Prisma Enum:* `PENDING`, `CONFIRMED`, `PROCESSING`, `PLACED`, `PARTIALLY_SHIPPED`, `PARTIALLY_DELIVERED`, `SHIPPED`, `DELIVERED`, `PARTIALLY_CANCELLED`, `CANCELLED`, `UNDER_DISPUTE`, `RETURNED`, `REFUNDED` (13 states).
  - *Divergence:* Contains 6 extraneous states (`PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `RETURNED`, `REFUNDED`).
- **`ReturnRequestStatus` (SRS 8.3):**
  - *SRS Permitted:* `Requested`, `Approved`, `Rejected`, `In Transit`, `Received`, `Verified`, `Rejected on Inspection`, `Refunded` (8 states).
  - *Prisma Enum:* `PENDING`, `REQUESTED`, `APPROVED`, `REJECTED`, `IN_TRANSIT`, `PICKUP_SCHEDULED`, `RECEIVED`, `VERIFIED`, `REJECTED_ON_INSPECTION`, `REFUNDED`, `COMPLETED`, `CANCELLED` (12 states).
  - *Divergence:* Contains extraneous states (`PENDING`, `PICKUP_SCHEDULED`, `COMPLETED`, `CANCELLED`).
- **`PaymentStatus` (SRS 8.4):**
  - *SRS Permitted:* `Pending`, `Paid`, `Failed`, `Partially Refunded`, `Refunded` (5 states).
  - *Prisma Enum:* `PENDING`, `PAID`, `FAILED`, `PARTIALLY_REFUNDED`, `REFUNDED`, `EXPIRED`, `CANCELLED` (7 states).
  - *Divergence:* Extraneous `EXPIRED`, `CANCELLED`.
- **`SettlementStatus` (SRS 8.5):**
  - *SRS Permitted for Items:* `Not Eligible`, `Eligible`, `Settled` (3 states).
  - *Prisma Enum:* Collapses batch status and item status into one enum containing `PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED, NOT_ELIGIBLE, ELIGIBLE, SETTLED`.
- **`SellerStatus` (SRS 8.6):**
  - *SRS Permitted:* `Pending Approval`, `Approved`, `Rejected`, `Suspended`, `Blocked`.
  - *Prisma Enum:* Uses `PENDING` instead of `PENDING_APPROVAL`.
- **`ProductStatus` (SRS 8.7):**
  - *SRS Permitted:* `Active`, `Paused`, `Hidden`, `Soft-Deleted`, `Removed by Admin`.
  - *Prisma Enum:* Uses `DELETED` instead of `SOFT_DELETED`.
- **`SellerCategoryStatus` (SRS 8.8):**
  - *SRS Permitted:* `Requested`, `Approved`, `Rejected`, `Revoked`.
  - *Prisma Enum:* Uses `PENDING` instead of `REQUESTED`.

### 4.2 Entity Models Field Comparison

1. **`User` (Entities/01-User.md)**
   - *Matching:* `id`, `fullName`, `email`, `passwordHash`, `accountStatus`, `emailVerified`, `lastLoginAt`, `createdAt`, `updatedAt`.
   - *Missing:* `mobileNumber`, `mobileVerified` (specified in Entity attributes, absent in Prisma).
   - *Extra in Prisma:* `accountType` (redundant with `role.name`), `emailVerificationHash`, `emailVerificationExpiresAt`.
2. **`SellerProfile` (Entities/06-Seller-Profile.md)**
   - *Matching:* `id`, `userId`, `sellerType`, `businessName`, `displayName`, `gstin`, `status`, `contactEmail`, `contactMobile`, `createdAt`, `updatedAt`.
3. **`SizeSet` & `SizeSetValue` (Entities/10a, 10b)**
   - *Matching:* `SizeSet` and `SizeSetValue` exist in `prisma/schema.prisma` with `code`, `label`, `sortOrder`, `isDefault`.
4. **`Category` (Entities/10-Category.md)**
   - *Matching:* `id`, `parentCategoryId`, `name`, `slug`, `description`, `sizeSetId`, `isActive`, `createdById`.
5. **`Product` (Entities/13-Product.md) & `ProductVariant` (Entities/13a-Product-Variant.md)**
   - *Missing on ProductVariant:* Compound unique constraint `@@unique([productId, size, color])` required by `Entities/13a-Product-Variant.md` validation rule 5.
   - *Divergent on Product:* `sku String @unique` exists on `Product` (old design) as well as on `ProductVariant` (new design). SRS FR-5 requires unique SKU per variant.
   - *Missing on ProductImage:* `variantId` (nullable) is missing from `ProductImage`. SRS FR-5 states: "Support multiple product images per product and per variant."
   - *Divergent on Inventory:* `Product` still retains a 1-to-1 relation with `Inventory` (`product.inventory`), and `ProductVariant` also has `inventory`.
6. **`OrderItem` (Entities/23-Order-Item.md)**
   - *Divergent:* `variantId` is nullable (`String? @db.Uuid`) in `prisma/schema.prisma`. In SRS v1.2, every order item must reference a product variant.
   - *Missing on OrderItem:* Default status is `PENDING` instead of `PLACED`.
   - *Matching:* Snapshot fields (`skuSnapshot`, `sizeSnapshot`, `colorSnapshot`, `commissionRate`, `commissionAmount`, `sellerEarnings`, dispute fields).
7. **`SettlementItem` (Entities/30-Settlement-Item.md)**
   - *Matching:* References `settlementId`, `orderItemId`, `sellerId`, `grossAmount`, `commissionRate`, `commissionAmount`, `refundAmount`, `adjustmentAmount`, `netAmount`.
   - *Missing:* Item status column `status` (`NOT_ELIGIBLE`, `ELIGIBLE`, `SETTLED`) is missing from `SettlementItem`.
8. **`SellerAdjustment` (Entities/30a-Seller-Adjustment.md)**
   - *Matching:* Model exists in `prisma/schema.prisma` with `type`, `amount`, `direction`, `status`, `orderItemId`, `returnRequestId`, `originatingSettlementId`, `appliedInSettlementId`, `isWrittenOff`, write-off audit columns.

---

## 5. Controller Routes vs. API Specifications (`docs/api/*`)

### 5.1 Critical Architectural Route Defect: Duplicate Global Prefix
In `src/main.ts` line 38:
```typescript
app.setGlobalPrefix('api/v1');
```
However, four controllers declare `@Controller('api/v1')`:
- `ReturnRefundController`: `@Controller('api/v1')` $\implies$ routes become `/api/v1/api/v1/returns`!
- `SettlementController`: `@Controller('api/v1')` $\implies$ routes become `/api/v1/api/v1/sellers/me/settlements`!
- `NotificationController`: `@Controller('api/v1')` $\implies$ routes become `/api/v1/api/v1/notifications`!
- `ReportingController`: `@Controller('api/v1')` $\implies$ routes become `/api/v1/api/v1/admin/reports/...`!

### 5.2 Critical Security Defect: Ineffective RolesGuard
In `src/auth/roles.guard.ts` lines 16–18:
```typescript
if (!requiredRoles || requiredRoles.length === 0) {
  return true;
}
```
If a route controller attaches `@UseGuards(RolesGuard)` without specifying `@Roles(...)`, the guard immediately grants access. As a result, almost all seller endpoints are accessible to customers because `@Roles('SELLER')` is omitted!

### 5.3 Detailed Route-by-Route Audit

| Controller | Method | Route Path | Role Guard Attached | Discrepancy vs. docs/api/* |
|---|---|---|---|---|
| `AuthController` | POST | `/api/v1/auth/register` | None (Public) | Matches `docs/api/authentication.md` |
| `AuthController` | POST | `/api/v1/auth/verify-email` | None (Public) | Matches |
| `AuthController` | POST | `/api/v1/auth/resend-verification` | **NOT CODED** | **Documented in api/authentication.md §2, but not implemented** |
| `AuthController` | POST | `/api/v1/auth/login` | None (Public) | Matches |
| `AuthController` | POST | `/api/v1/auth/refresh` | None (Public) | Matches |
| `AuthController` | POST | `/api/v1/auth/logout` | `AuthGuard` | Matches |
| `AuthController` | POST | `/api/v1/auth/logout-all` | `AuthGuard` | Matches |
| `AuthController` | GET | `/api/v1/auth/me` | `AuthGuard` | Matches |
| `AuthController` | POST | `/api/v1/auth/forgot-password` | None (Public) | Matches |
| `AuthController` | POST | `/api/v1/auth/reset-password` | None (Public) | Matches |
| `AuthController` | GET | `/api/v1/auth/sessions` | `AuthGuard` | Matches |
| `AuthController` | DELETE | `/api/v1/auth/sessions/current` | `AuthGuard` | Shape difference: spec has `/sessions/:sessionId` |
| `AuthController` | GET | `/api/v1/auth/admin/check` | `@Roles('ADMIN')` | Divergent role name (`ADMIN` vs `SUPER_ADMIN`) |
| `CustomerController` | GET | `/api/v1/customers/me` | `AuthGuard` | **Missing `@Roles('CUSTOMER')`** |
| `CustomerController` | PATCH | `/api/v1/customers/me` | `AuthGuard` | **Missing `@Roles('CUSTOMER')`** |
| `CustomerController` | GET | `/api/v1/customers/me/addresses` | `AuthGuard` | **Missing `@Roles('CUSTOMER')`** |
| `CustomerController` | POST | `/api/v1/customers/me/addresses` | `AuthGuard` | **Missing `@Roles('CUSTOMER')`** |
| `CustomerController` | GET/PATCH/DEL | `/api/v1/customers/me/addresses/:id` | `AuthGuard` | **Missing `@Roles('CUSTOMER')`** |
| `SellerController` | POST | `/api/v1/sellers` | `AuthGuard, RolesGuard` | **Missing `@Roles('SELLER')`** |
| `SellerController` | GET/PATCH | `/api/v1/sellers/me` | `AuthGuard, RolesGuard` | **Missing `@Roles('SELLER')`** |
| `SellerController` | GET | `/api/v1/sellers/me/status` | `AuthGuard, RolesGuard` | **Missing `@Roles('SELLER')`** |
| `SellerController` | POST | `/api/v1/sellers/me/verification/resubmit` | `AuthGuard, RolesGuard` | **Missing `@Roles('SELLER')`** |
| `SellerController` | GET/POST/DEL | `/api/v1/sellers/me/addresses` | `AuthGuard, RolesGuard` | **Missing `@Roles('SELLER')`** |
| `SellerController` | GET/POST | `/api/v1/sellers/me/documents` | `AuthGuard, RolesGuard` | **Missing `@Roles('SELLER')`** |
| `SellerController` | GET | `/api/v1/admin/sellers` | `@Roles('SUPER_ADMIN', 'ADMIN')` | Matches |
| `SellerController` | GET | `/api/v1/admin/sellers/:id` | `@Roles('SUPER_ADMIN', 'ADMIN')` | Matches |
| `SellerController` | POST | `/api/v1/admin/sellers/:id/approve` | `@Roles('SUPER_ADMIN', 'ADMIN')` | Matches |
| `SellerController` | POST | `/api/v1/admin/sellers/:id/reject` | `@Roles('SUPER_ADMIN', 'ADMIN')` | Matches |
| `SellerController` | PATCH | `/api/v1/admin/sellers/:id/status` | `@Roles('SUPER_ADMIN', 'ADMIN')` | Matches |
| `SellerController` | GET | `/api/v1/admin/sellers/:id/documents/:docId/download` | `@Roles('SUPER_ADMIN', 'ADMIN')` | Matches |
| `CategoryController` | GET | `/api/v1/categories` | None (Public) | Matches |
| `CategoryController` | GET | `/api/v1/sellers/me/categories/available` | `AuthGuard, RolesGuard` | **Missing `@Roles('SELLER')`** |
| `CategoryController` | POST | `/api/v1/sellers/me/category-requests` | `AuthGuard, RolesGuard` | **Missing `@Roles('SELLER')`** |
| `CategoryController` | GET | `/api/v1/sellers/me/category-requests` | `AuthGuard, RolesGuard` | **Missing `@Roles('SELLER')`** |
| `CategoryController` | GET | `/api/v1/sellers/me/categories` | `AuthGuard, RolesGuard` | **Missing `@Roles('SELLER')`** |
| `CategoryController` | POST/PATCH/DEL | `/api/v1/admin/categories` | `@Roles('SUPER_ADMIN', 'ADMIN')` | Matches |
| `CategoryController` | GET/PUT | `/api/v1/admin/categories/:id/commission` | `@Roles('SUPER_ADMIN', 'ADMIN')` | Matches |
| `CategoryController` | GET/POST | `/api/v1/admin/category-requests` | `@Roles('SUPER_ADMIN', 'ADMIN')` | Matches |
| `CategoryController` | ALL | `/api/v1/admin/size-sets` | **NOT CODED** | **Documented in SRS FR-3 / UC-ADM-03, but completely missing in backend** |
| `ProductController` | GET | `/api/v1/products` | None (Public) | Matches |
| `ProductController` | GET/POST/PATCH/DEL | `/api/v1/sellers/me/products` | `AuthGuard, RolesGuard` | **Missing `@Roles('SELLER')`** |
| `ProductController` | POST | `/api/v1/sellers/me/products/:id/duplicate` | `AuthGuard, RolesGuard` | **Missing `@Roles('SELLER')`** |
| `ProductController` | POST | `/api/v1/sellers/me/products/:id/pause` | `AuthGuard, RolesGuard` | **Missing `@Roles('SELLER')`** |
| `ProductController` | POST | `/api/v1/sellers/me/products/:id/activate` | `AuthGuard, RolesGuard` | **Missing `@Roles('SELLER')`** |
| `ProductController` | POST | `/api/v1/sellers/me/products/:id/hide` | `AuthGuard, RolesGuard` | **Missing `@Roles('SELLER')`** |
| `ProductController` | ALL | `/api/v1/sellers/me/products/:id/variants` | **NOT CODED** | **Documented in SRS FR-5 / BR-3 / UC-SEL-02, but completely missing in backend** |
| `ProductController` | POST | `/api/v1/admin/products/:id/takedown` | **NOT CODED** | **Documented in SRS FR-5 / BR-4 / UC-ADM-06, but missing in controller** |
| `InventoryController` | GET/PATCH | `/api/v1/sellers/me/inventory` | `AuthGuard, RolesGuard` | **Missing `@Roles('SELLER')`. Operates on product, not variant.** |
| `InventoryController` | POST | `/api/v1/inventory/reservations` | **NONE** | **Completely unprotected internal endpoint** |
| `CartController` | ALL | `/api/v1/cart/**` | `AuthGuard` | **Missing `@Roles('CUSTOMER')`. Accepts productId, not variantId.** |
| `OrderController` | POST | `/api/v1/checkout` | `AuthGuard` | **Missing `@Roles('CUSTOMER')`** |
| `OrderController` | GET | `/api/v1/orders` | `AuthGuard` | **Missing `@Roles('CUSTOMER')`** |
| `OrderController` | GET/PATCH | `/api/v1/sellers/me/orders` | `AuthGuard, RolesGuard` | **Missing `@Roles('SELLER')`** |
| `OrderController` | GET | `/api/v1/admin/orders` | `@Roles('SUPER_ADMIN')` | Matches |
| `OrderController` | POST | `/api/v1/orders/:id/items/:itemId/not-received` | **NOT CODED** | **SRS FR-9 & AC-5: Customer 7-day "Not received" dispute reporting missing** |
| `OrderController` | POST | `/api/v1/admin/disputes/:id/arbitrate` | **NOT CODED** | **SRS FR-9 & UC-ADM-07: Admin 3-day SLA dispute resolution missing** |
| `PaymentController` | POST | `/api/v1/payments/confirm` | `AuthGuard` | Matches |
| `PaymentController` | POST | `/api/v1/payments/webhooks/razorpay` | None (Public) | Matches (Signature header verified in service) |
| `PaymentController` | POST | `/api/v1/payments/admin/:ref/reconcile` | `@Roles('SUPER_ADMIN')` | Matches |
| `ReturnRefundController` | POST | `/api/v1/api/v1/orders/:id/items/:itemId/returns` | `@Roles('CUSTOMER')` | **Double prefix `/api/v1/api/v1`** |
| `ReturnRefundController` | GET | `/api/v1/api/v1/sellers/me/returns` | `@Roles('SELLER')` | **Double prefix `/api/v1/api/v1`** |
| `ReturnRefundController` | POST | Return lifecycle transitions | **NOT CODED** | **SRS Section 8.3 stages (`In Transit`, `Received`, `Verified`, `Rejected on Inspection`) missing** |
| `SettlementController` | GET | `/api/v1/api/v1/sellers/me/settlements` | `@Roles('SELLER')` | **Double prefix `/api/v1/api/v1`** |
| `SettlementController` | POST | `/api/v1/api/v1/admin/settlements` | `@Roles('SUPER_ADMIN')` | **Double prefix `/api/v1/api/v1`** |
| `SettlementController` | ALL | `/api/v1/admin/adjustments` | **NOT CODED** | **SRS FR-12 / BR-12: SellerAdjustment debit ledger & write-off endpoints missing** |
| `NotificationController` | ALL | `/api/v1/api/v1/notifications/**` | `@Roles(...)` | **Double prefix `/api/v1/api/v1`** |
| `ReportingController` | ALL | `/api/v1/api/v1/admin/reports/**` | `@Roles('SUPER_ADMIN')` | **Double prefix `/api/v1/api/v1`** |

---

## 6. Functional & Business Requirements Traceability Matrix

Status Definitions:
- **Implemented:** Fully meets SRS v1.2 specification with test evidence.
- **Partial:** Implemented in part, but missing key v1.2 features (e.g. variants, Size Sets, debits).
- **Missing:** Not implemented in backend codebase.
- **Divergent:** Implemented according to outdated/conflicting logic (e.g. wrong statuses, bypassing verification).

| ID | Requirement Title | Status | Evidence (File, Function, Line) | Covering Test |
|---|---|---|---|---|
| **FR-1** | User Authentication & Account Management | **Divergent** | `src/auth/auth.service.ts`: `register` (lines 37, 46) auto-activates non-production registrations and customers; bypasses email verification. | `test/auth.service.spec.ts`, `test/auth-flow.integration.spec.ts` (Both failing) |
| **FR-2** | Seller Onboarding & KYC Identity Verification | **Implemented** | `src/seller/seller.service.ts`: `createSellerProfile` (line 46), `submitDocument` (line 410), `approveSeller` (line 730), `rejectSeller` (line 800). | `test/seller.service.spec.ts`, `test/seller-flow.integration.spec.ts` |
| **FR-3** | Clothing Category & Size Set Management | **Partial** | `src/category/category.service.ts`: `createCategory` (line 35), `requestCategories` (line 160). Size Set CRUD and subcategory SizeSet binding are completely missing. | `test/category.service.spec.ts`, `test/category-flow.integration.spec.ts` |
| **FR-4** | Category Commission Management | **Implemented** | `src/category/category.service.ts`: `configureCommission` (line 120). Locks commission at checkout (`src/order/order.service.ts:148`). | `test/category.service.spec.ts`, `test/category-flow.integration.spec.ts` |
| **FR-5** | Product & Variant Management | **Partial** | `src/product/product.service.ts`: Product CRUD (lines 40–150). ProductVariant Size $\times$ Color creation, SKU uniqueness, and variant image binding are missing. | `test/product.service.spec.ts`, `test/product-flow.integration.spec.ts` (Tests encode old no-variant model) |
| **FR-6** | Inventory & Stock Management | **Partial** | `src/inventory/inventory.service.ts`: `reserveStock` (line 303), `adjustStock` (line 126). Operates on product level instead of variant level; concurrency race condition. | `test/inventory.service.spec.ts`, `test/inventory-flow.integration.spec.ts` |
| **FR-7** | Shopping Cart & Free Shipping Progress | **Partial** | `src/cart/cart.service.ts`: Cart CRUD (lines 30–120), shipping calculation (line 145). Uses productId instead of variantId. | `test/cart.service.spec.ts`, `test/customer-cart-flow.integration.spec.ts` |
| **FR-8** | Shipping & Delivery Fee Calculation | **Partial** | `src/cart/cart.service.ts`: Flat fee + free shipping threshold (lines 145–165). `shippingFeeShare` not properly snapshotted in `OrderItem`. | `test/checkout-order-payment-flow.integration.spec.ts` |
| **FR-9** | Split Order Fulfillment & Delivery Disputes | **Divergent** | `src/order/order.service.ts`: `updateSellerOrderItemStatus` (line 542). Uses `CONFIRMED`/`PROCESSING` instead of `Placed`/`Packed`. Missing 7-day "Not received" dispute reporting. | `test/order.service.spec.ts`, `test/checkout-order-payment-flow.integration.spec.ts` |
| **FR-10** | Payment Management & Refund Processing | **Implemented** | `src/payment/payment.service.ts`: `verifyClientPayment` (line 80), `handleRazorpayWebhook` (line 188), `reconcilePayment` (line 315). | `test/payment.service.spec.ts`, `test/checkout-order-payment-flow.integration.spec.ts` |
| **FR-11** | Returns, Inspection & Refund Workflow | **Partial** | `src/return-refund/return-refund.service.ts`: `createReturnRequest` (line 45), `approveReturnRequest` (line 210). Missing 8-stage lifecycle (In Transit, Received, Verified, Rejected on Inspection). | `test/return-refund.service.spec.ts`, `test/return-refund-settlement-flow.integration.spec.ts` |
| **FR-12** | Weekly Manual Settlement & Adjustment Ledger | **Partial** | `src/settlement/settlement.service.ts`: `previewSettlement` (line 106), `createSettlement` (line 210). Missing SellerAdjustment shortfall debits, negative balance ₹0 floor, dispute chargebacks. | `test/settlement.service.spec.ts`, `test/return-refund-settlement-flow.integration.spec.ts` |
| **FR-13** | Master Notification System | **Implemented** | `src/notification/notification.service.ts`: In-app queries (lines 30–70), template CRUD (lines 90–140), delivery retry (line 150). | `test/notification.service.spec.ts`, `test/notification-reporting-flow.integration.spec.ts` |
| **FR-14** | Reports & Analytics | **Implemented** | `src/reporting/reporting.service.ts`: Sales (line 40), revenue (line 104), commission (line 165), audit logs (line 330). | `test/reporting.service.spec.ts`, `test/notification-reporting-flow.integration.spec.ts` |
| **BR-1** | Seller Registration & Identity Verification | **Implemented** | `src/seller/seller.service.ts:46,410,730`. Pending Approval until Super Admin approves. | `test/seller.service.spec.ts` |
| **BR-2** | Category Authorization & Commission Hierarchy | **Implemented** | `src/category/category.service.ts:160,280`. Sellers restricted to approved categories. | `test/category.service.spec.ts` |
| **BR-3** | Clothing Catalog, Size Sets & Variant Integrity | **Missing** | ProductVariant Size $\times$ Color validation against subcategory SizeSet is not implemented. | `test/product.service.spec.ts` (Encodes old no-variant model) |
| **BR-4** | Product Visibility & Archival | **Partial** | `src/product/product.service.ts:180,210`. Active, Paused, Hidden, Deleted exist; Admin takedown with mandatory reason missing. | `test/product.service.spec.ts` |
| **BR-5** | Inventory & Out-of-Stock Dynamics | **Partial** | `src/inventory/inventory.service.ts:280,318`. Out-of-stock logic exists at product level, not variant level. | `test/inventory.service.spec.ts` |
| **BR-6** | Admin Moderation & Product Ownership Bounds | **Partial** | Admin cannot edit third-party products, but Admin takedown endpoint is absent. | `test/product.service.spec.ts` |
| **BR-7** | Admin Direct Retail & Inventory Segregation | **Partial** | 0% commission logic exists (`category.service.ts:112`), but segregation in settlement engine is not enforced. | `test/category.service.spec.ts` |
| **BR-8** | Multi-Vendor Cart Partitioning & Free Shipping | **Implemented** | `src/cart/cart.service.ts:145–180`. Free shipping threshold evaluated per-seller. | `test/cart.service.spec.ts` |
| **BR-9** | Order State Integrity & Split Shipments | **Divergent** | `src/order/order.service.ts:572`. State transitions encode old `PENDING->CONFIRMED->PROCESSING->SHIPPED`. | `test/order.service.spec.ts` |
| **BR-10** | Tax & Shipping Rules | **Implemented** | Selling price inclusive of GST; shipping fee calculation per seller. | `test/order.service.spec.ts` |
| **BR-11** | 5-Day Returns, Inspection & Dispute Governance | **Partial** | 5-day window enforced (`return-refund.service.ts:80`); 7-day "Not received" dispute arbitration missing. | `test/return-refund.service.spec.ts` |
| **BR-12** | Weekly Manual Settlement & Negative Balance | **Partial** | 7-day post-delivery hold checked (`settlement.service.ts:79`); negative net payout ₹0 floor and shortfall debits missing. | `test/settlement.service.spec.ts` |
| **BR-13** | Standardized Notifications Master List | **Implemented** | Notification channels and event types implemented in `notification.service.ts`. | `test/notification.service.spec.ts` |
| **AC-1** | Seller Management Acceptance Criteria | **Implemented** | Onboarding, KYC upload, document download, status changes meet criteria. | `test/seller-flow.integration.spec.ts` |
| **AC-2** | Category & Commission Governance | **Partial** | Hierarchy and commission meet criteria; Size Sets missing. | `test/category-flow.integration.spec.ts` |
| **AC-3** | Product & Variant Catalog | **Missing** | Criteria require Size $\times$ Color variants and SKU per variant. | `test/product-flow.integration.spec.ts` |
| **AC-4** | Customer Experience & Multi-Vendor Checkout | **Partial** | Cart and checkout meet criteria, but without variant selection. | `test/customer-cart-flow.integration.spec.ts` |
| **AC-5** | Order Processing, Disputes & Cancellation | **Partial** | Split orders and cancellation meet criteria; "Not received" disputes missing. | `test/checkout-order-payment-flow.integration.spec.ts` |
| **AC-6** | 5-Day Returns & Inspection | **Partial** | Basic return request meets criteria; physical receipt and inspection rejection missing. | `test/return-refund-settlement-flow.integration.spec.ts` |
| **AC-7** | Weekly Manual Settlement & Adjustments | **Partial** | Settlement preview meets criteria; debit ledger shortfall recording missing. | `test/return-refund-settlement-flow.integration.spec.ts` |
| **AC-8** | Notifications & Reporting | **Implemented** | Templates, logs, and analytics meet criteria. | `test/notification-reporting-flow.integration.spec.ts` |
| **UC-ADM-01** | Authenticate Super Admin | **Implemented** | `src/auth/auth.service.ts:78` (`login`), role verified. | `test/auth-flow.integration.spec.ts` |
| **UC-ADM-02** | Moderate Seller Onboarding | **Implemented** | `src/seller/seller.service.ts:730,800,850`. Review, approve, reject, suspend, block. | `test/seller-flow.integration.spec.ts` |
| **UC-ADM-03** | Manage Clothing Categories & Size Sets | **Partial** | Category CRUD implemented; Size Set management missing. | `test/category-flow.integration.spec.ts` |
| **UC-ADM-04** | Authorize Seller Categories | **Implemented** | `src/category/category.service.ts:280,330,380`. Approve, reject, revoke. | `test/category-flow.integration.spec.ts` |
| **UC-ADM-05** | Configure Shipping Parameters | **Partial** | Hardcoded parameters in ConfigService; no dynamic Admin configuration endpoint. | `test/cart.service.spec.ts` |
| **UC-ADM-06** | Moderate Product Listings | **Missing** | Admin takedown endpoint with mandatory reason is not coded. | `test/product.service.spec.ts` |
| **UC-ADM-07** | Resolve Return & Delivery Disputes | **Missing** | Admin dispute arbitration endpoint for "Not received" claims is not coded. | `test/return-refund-settlement-flow.integration.spec.ts` |
| **UC-ADM-08** | Execute Weekly Manual Settlements & Debits | **Partial** | Preview and payout recording exist; shortfall debit recording and write-offs missing. | `test/return-refund-settlement-flow.integration.spec.ts` |
| **UC-ADM-09** | Manage Admin Direct Retail | **Partial** | 0% commission exists; catalog listing direct bypass not explicitly tested. | `test/category.service.spec.ts` |
| **UC-SEL-01** | Seller Onboarding | **Implemented** | `src/seller/seller.service.ts:46,410`. KYC and bank details submission. | `test/seller-flow.integration.spec.ts` |
| **UC-SEL-02** | Manage Clothing Catalog | **Partial** | Product CRUD implemented; variant creation missing. | `test/product-flow.integration.spec.ts` |
| **UC-SEL-03** | Variant Inventory Control | **Partial** | Inventory control implemented at product level, not variant level. | `test/inventory-flow.integration.spec.ts` |
| **UC-SEL-04** | Fulfill Order Items | **Divergent** | Status updates use `CONFIRMED`/`PROCESSING` instead of `Placed`/`Packed`. | `test/checkout-order-payment-flow.integration.spec.ts` |
| **UC-SEL-05** | Pre-Shipment Seller Cancellation | **Implemented** | `src/order/order.service.ts:358`. Cancellation allowed prior to `Shipped`. | `test/order.service.spec.ts` |
| **UC-SEL-06** | Inspect Returned Products | **Missing** | Seller return receipt and inspection verification endpoints missing. | `test/return-refund-settlement-flow.integration.spec.ts` |
| **UC-SEL-07** | Manage Dispute Claims | **Missing** | Seller viewing and attaching proof to "Not received" claims missing. | `test/checkout-order-payment-flow.integration.spec.ts` |
| **UC-SEL-08** | Access Settlement Reports & Debit Ledger | **Partial** | Settlement report exists; debit ledger viewing missing. | `test/return-refund-settlement-flow.integration.spec.ts` |
| **UC-CUS-01** | Customer Account Management | **Implemented** | `src/auth/auth.service.ts`, `src/customer/customer.service.ts`. | `test/auth-flow.integration.spec.ts` |
| **UC-CUS-02** | Browse Clothing Catalog | **Partial** | Catalog search exists, but variant size/color filtering is absent. | `test/product.service.spec.ts` |
| **UC-CUS-03** | Multi-Vendor Cart & Checkout | **Partial** | Cart and checkout exist, but items lack variant reference. | `test/checkout-order-payment-flow.integration.spec.ts` |
| **UC-CUS-04** | Track Shipments | **Implemented** | `src/order/order.service.ts:300`. Customer views items with courier & AWB. | `test/order.service.spec.ts` |
| **UC-CUS-05** | Pre-Shipment Cancellation | **Implemented** | `src/order/order.service.ts:358`. Blocked once marked `Shipped`. | `test/order.service.spec.ts` |
| **UC-CUS-06** | 5-Day Return or Report "Not Received" | **Partial** | 5-day return request exists; 7-day "Not received" reporting missing. | `test/return-refund.service.spec.ts` |

---

## 7. Architecture & Implementation Checklist

### 7.1 Money Type
- **Evidence:** `prisma/schema.prisma` uses `Decimal @db.Decimal(10, 2)` on all monetary columns (`price`, `subtotal`, `totalAmount`, `grossAmount`, `netSettlementAmount`, `commissionAmount`).
- **Defect / Gap:** In `src/return-refund/return-refund.service.ts:783` and `src/order/order.service.ts:148`, monetary math is performed via JavaScript `Number(...)` floating-point arithmetic rather than `Prisma.Decimal` methods, introducing potential precision/rounding errors.

### 7.2 Database Transactions
- **Evidence:**
  - `src/order/order.service.ts:80`: `initiateCheckout` wraps inventory validation, reservations, cart clearing, and order insertion in `this.prisma.$transaction`.
  - `src/seller/seller.service.ts:53,566`: Profile creation and verification submissions run in `$transaction`.
  - `src/settlement/settlement.service.ts:229`: Settlement batch creation runs in `$transaction`.
  - `src/return-refund/return-refund.service.ts:111,792`: Return approval and refund processing run in `$transaction`.

### 7.3 Concurrent Stock Safety
- **Evidence:** `src/inventory/inventory.service.ts:327–343`.
- **Defect / Critical Concurrency Risk:** `reserveStock` reads available inventory via `findUnique`, computes `newAvailable = availableQuantity - requested` in memory, and writes it back via `update`. It does **not** use conditional atomic updates (`WHERE available_quantity >= requested`), pessimistic row locking (`SELECT FOR UPDATE`), or PostgreSQL serializable transactions. Two concurrent transactions can read the same stock and oversell inventory.

### 7.4 Webhook Signature & Idempotency
- **Evidence:**
  - `src/payment/payment.service.ts:188–200`: Verifies `x-razorpay-signature` using HMAC-SHA256 with `RAZORPAY_WEBHOOK_SECRET`. (Uses standard `!==` string comparison instead of constant-time `crypto.timingSafeEqual`).
  - `src/payment/payment.service.ts:217–223`: Enforces idempotency via `PaymentTransaction.findUnique({ where: { providerTransactionId: razorpayPaymentId } })`.

### 7.5 Ownership Checks
- **Evidence:**
  - Customer order operations verify `where: { id: orderId, customerId: customer.id }` (`src/order/order.service.ts:303,365`).
  - Seller order item operations verify `where: { id: orderItemId, orderId, sellerId: seller.id }` (`src/order/order.service.ts:557`).
  - Seller inventory operations verify `product.sellerId === seller.id` (`src/inventory/inventory.service.ts:98,141`).
- **Defect:** Controller routes lack role guards (`@Roles('SELLER')`, `@Roles('CUSTOMER')`), meaning ownership logic prevents cross-tenant data access, but unauthorized roles can still invoke the endpoints.

### 7.6 Commission Snapshot on Order Items
- **Evidence:** `src/order/order.service.ts:144–149,164–166`.
- **Defect:** `commissionRate` and `commissionAmount` are snapshotted on `OrderItem`, but `shippingFeeShare` is defaulted to `0.00` and not computed. Also, commission lookup `product.category?.commissions?.[0]` blindly picks the first array element without verifying active status or subcategory hierarchy.

### 7.7 Settlement Eligibility
- **Evidence:** `src/settlement/settlement.service.ts:73–101`.
- **Defect:** Checks `deliveredAt + 7 days <= periodTo` and absence of active returns/refunds, but:
  1. Fails to check if the item is under dispute (`NOT_RECEIVED_UNDER_DISPUTE`).
  2. Queries candidate items by order creation date (`createdAt: { gte: periodFrom, lte: periodTo }`) rather than `deliveredAt`, omitting older orders delivered during the cycle.
  3. Does not filter out Super Admin direct retail sales (which incur 0% commission and no settlement).

### 7.8 Hard Deletion Prevention
- **Evidence:** No calls to `prisma.order.delete`, `prisma.orderItem.delete`, or `prisma.settlement.delete` exist in application code.
- **Defect in Schema:** `prisma/schema.prisma:805` specifies `onDelete: Cascade` on `order Order`, and line 1023 specifies `onDelete: Cascade` on `settlement Settlement`, which permits cascading deletions at the database level if a parent row is removed.

### 7.9 Status Enums Alignment (SRS Section 8)
- **Evidence:** Enums in `prisma/schema.prisma` diverge significantly from SRS Section 8 (details in Section 4.1 of this audit).

### 7.10 DTO Validation
- **Evidence:** `src/main.ts:39–45` registers global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true, transform: true`. DTOs use `class-validator` and `class-transformer`.

### 7.11 Pagination
- **Evidence:** Query DTOs (`OrderQueryDto`, `SellerQueryDto`, `ReportFilterDto`) provide `page` and `limit`. Services calculate `skip = (page - 1) * limit` and return total counts.
- **Defect:** `getSellerInventory` in `inventory.service.ts:35` queries all seller products without pagination.

### 7.12 Rate Limiting
- **Evidence:** `src/app.module.ts:27–38` registers `ThrottlerModule` with `default` (100 req/min) and `auth` (10 req/15min). Controllers attach `@Throttle`.

### 7.13 Secrets from Environment Only
- **Evidence:** Secrets are fetched via `ConfigService` (`JWT_ACCESS_SECRET`, `RAZORPAY_KEY_SECRET`, `DATABASE_URL`).
- **Defect:** Hardcoded fallback values exist in code (e.g. `'marketplace-default-dev-secret-key-32'` in `src/auth/auth.module.ts:13` and `'storage-secret'` in `src/storage/storage.service.ts:88`).

---

## 8. File Storage & Email Services Current State vs. Production Needs

### 8.1 File Storage Service (`StorageService`)
- **Current Behavior (`src/storage/storage.service.ts`):**
  - Concrete class directly writing files to `./storage_private` using `fs.promises.writeFile`.
  - Base directory is hardcoded: `path.resolve(process.cwd(), 'storage_private')` (line 33).
  - Generates HMAC-signed download URLs routed through `GET /api/v1/admin/sellers/:id/documents/:docId/download`.
- **Tests Writing Files to Project Directory:**
  - `test/storage.service.spec.ts:32`: Calls `uploadVerificationDocument`, writing `aadhaar_card.pdf` into `backend/storage_private/sellers/seller-uuid-1/verifications/1/`. Does **not** clean up files.
  - `test/seller-flow.integration.spec.ts:47,205`: Instantiates real `StorageService` and writes two mock PDF documents into `backend/storage_private/sellers/...`. Does **not** clean up files.
- **Production Needs:**
  - Provide an `IStorageService` interface abstraction (ADR-004 remains undecided).
  - Storage base directory must be configurable via `STORAGE_BASE_DIR` environment variable.
  - Development implementation: local filesystem in a designated path.
  - Tests must write strictly to OS temp directories (`os.tmpdir()`) and clean up in `afterAll()`.
  - Production implementation: Cloud object storage (AWS S3, Google Cloud Storage, or Azure Blob) using pre-signed upload and download URLs with SSE-KMS encryption.

### 8.2 Email Service (`EmailService`)
- **Current Behavior (`src/email/email.service.ts`):**
  - Concrete class implementing `sendEmail`, `sendVerificationEmail`, `sendPasswordResetEmail`.
  - Inspects `EMAIL_PROVIDER`: defaults to `'logger'` and logs formatted text boxes to NestJS Logger console. Contains an empty fallback for AWS SES.
- **Production Needs:**
  - Place `EmailService` behind an `IEmailService` interface.
  - Development implementation: logger transport or local MailHog/InBucket SMTP.
  - Production implementation: AWS SES, Resend, or SendGrid integration with DKIM/SPF domain verification, HTML templating engine (Handlebars/MJML), and asynchronous queue processing (BullMQ / AWS SQS) with dead-letter queue retries.

---

## 9. Summary Counts, 15 Most Dangerous Gaps & Tests Encoding Old Rules

### 9.1 Status Counts Across Specification Requirements
- **Total Requirements Tracked:** 35 (14 FRs, 13 BRs, 8 ACs)
- **Implemented:** 12 (34.3%)
- **Partial:** 17 (48.6%)
- **Divergent:** 3 (8.6%)
- **Missing:** 3 (8.6%)

### 9.2 The 15 Most Dangerous Gaps

1. **Broken Email Verification & Test Suite Failure (`auth.service.ts:37`):** Auto-activation bypass breaks tests and violates SRS FR-1 / auth specification.
2. **Missing Product Variants Architecture (SRS FR-5, BR-3):** Products are modeled and sold as flat items with single SKUs and single stock records; Size $\times$ Color variants are entirely unimplemented in services, controllers, and tests.
3. **Missing Size Sets Management (SRS FR-3, UC-ADM-03):** Data-driven Size Sets (Alpha, Men's Waist, Women's Waist, Kids, Free Size) and subcategory SizeSet bindings do not exist in Category management.
4. **Non-Atomic Stock Reservation / Overselling Race Condition (`inventory.service.ts:327`):** Unprotected read-modify-write cycle in `reserveStock` will cause overselling under concurrent load.
5. **Ineffective Role Authorization Guards Across All Seller Routes:** RolesGuard allows any authenticated user (e.g. Customers) to access seller endpoints due to missing `@Roles('SELLER')` decorators on controllers.
6. **Double Global Prefix on Controllers (`/api/v1/api/v1/...`):** `ReturnRefundController`, `SettlementController`, `NotificationController`, and `ReportingController` declare `@Controller('api/v1')` on top of global prefix `'api/v1'`.
7. **Missing Customer "Not Received" 7-Day Dispute Endpoint (SRS FR-9, AC-5):** No API endpoint exists for customers to trigger delivery disputes, blocking Super Admin arbitration.
8. **Missing Super Admin 3-Business-Day Dispute Arbitration Endpoint (SRS FR-9, UC-ADM-07):** No endpoint exists for Super Admin to arbitrate delivery disputes or apply dispute chargebacks.
9. **Truncated Return Lifecycle (SRS Section 8.3, FR-11):** Missing 8-stage return workflow (customer tracking submission, seller physical receipt, inspection verification, inspection rejection).
10. **Missing Seller Adjustment Shortfall Debit Ledger (SRS FR-12, BR-12):** Negative weekly settlement amounts are not floored at ₹0, and shortfall debits are not created or carried forward in `SellerAdjustment`.
11. **Divergent State Enumerations in Database Schema (`schema.prisma`):** `OrderStatus`, `OrderItemStatus`, `ReturnRequestStatus`, `SellerStatus`, and `ProductStatus` contain non-SRS statuses (`PENDING`, `CONFIRMED`, `PROCESSING`, `DELETED`).
12. **Tests Writing Real Files to Project Directory (`storage_private`):** `test/storage.service.spec.ts` and `test/seller-flow.integration.spec.ts` write uncleaned files into the repository root.
13. **Zero Real Database Integration Tests:** All 9 integration tests use in-memory Maps and stubbed Prisma methods, leaving real schema constraints, migrations, and PostgreSQL transactions completely unverified.
14. **Missing Super Admin Listing Takedown Endpoint (SRS FR-5, BR-4, UC-ADM-06):** No endpoint exists for Super Admin to delist non-compliant products with a mandatory takedown reason.
15. **Unprotected Internal Inventory Endpoints (`inventory.controller.ts:66–88`):** `/inventory/reservations`, `/inventory/validate`, `/inventory/reservations/confirm`, `/inventory/reservations/release` have no authentication or role guards.

### 9.3 Existing Tests Encoding Old Rules (Must Be Rewritten, Never Deleted)
The following test suites encode the deprecated single-item model, flat SKU pricing, and outdated status state machines:

1. **`test/product.service.spec.ts`:** Tests product creation and pricing directly on parent Product without creating Size $\times$ Color variants.
2. **`test/product-flow.integration.spec.ts`:** End-to-end flow tests product cataloging with no variants and no SizeSet validation.
3. **`test/inventory.service.spec.ts`:** Tests stock adjustments and reservations referencing `productId` rather than `variantId`.
4. **`test/inventory-flow.integration.spec.ts`:** Concurrency integration test manages inventory at product level.
5. **`test/cart.service.spec.ts`:** Tests adding products to cart by `productId` rather than selecting variants.
6. **`test/customer-cart-flow.integration.spec.ts`:** Cart flow tests checkout with flat products.
7. **`test/order.service.spec.ts`:** Asserts old status transitions (`PENDING -> CONFIRMED -> PROCESSING -> SHIPPED -> DELIVERED`) instead of SRS Section 8.1 (`Placed -> Packed -> Shipped -> Delivered`).
8. **`test/checkout-order-payment-flow.integration.spec.ts`:** Checkout flow expects order items without `variantId`, `sizeSnapshot`, or `colorSnapshot`, using obsolete statuses.
9. **`test/category.service.spec.ts`:** Tests category creation without Size Set assignment.
10. **`test/category-flow.integration.spec.ts`:** Category flow tests hierarchy without Size Set binding.
11. **`test/return-refund.service.spec.ts`:** Tests truncated 3-stage return lifecycle (`REQUESTED -> APPROVED -> COMPLETED`) omitting the 8-stage SRS Section 8.3 lifecycle.
12. **`test/return-refund-settlement-flow.integration.spec.ts`:** Settlement integration test does not test `SellerAdjustment` debit ledger, negative balance ₹0 floor, or shortfall debits.
13. **`test/seller.service.spec.ts` & `test/seller-flow.integration.spec.ts`:** Tests `SellerStatus.PENDING` instead of `Pending Approval`.

---

## 10. Audit Conclusion & Next Steps

The backend has strong foundation modules (NestJS dependency injection, Prisma ORM, Fastify adapter, Razorpay webhook signature verification, JWT session rotation, and audit logging), but it currently reflects an early prototype before the SRS v1.2 specification was finalized:
- Products, inventory, cart, and orders lack the **Product Variant (Size $\times$ Color)** and **Size Set** models.
- Status enumerations across order fulfillment, returns, settlements, and sellers diverge from SRS Section 8.
- Routes suffer from duplicate global prefixes and ineffective role guards.
- Settlement negative balance governance (Seller Adjustment ledger) is not integrated.

Phase 1 audit is complete. Awaiting user approval to proceed to Phase 2 (Refactoring Plan).
