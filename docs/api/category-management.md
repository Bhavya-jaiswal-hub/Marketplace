# Category & Commission API

## Document Information

| Field | Value |
|------|------|
| Document Name | Category & Commission API |
| Product | Multi-Vendor Marketplace |
| API Version | v1 |
| Status | Draft |
| Parent Document | API Design |
| Related Documents | Authentication API, Seller Management API |
| Last Updated | DD-MM-YYYY |

---

# 1. Overview

The Category & Commission API manages the marketplace category structure,
seller category permissions, and category-level commission configuration.

The Category Management module is responsible for:

- Marketplace categories
- Subcategories
- Category hierarchy
- Seller category requests
- Seller category approval
- Seller category rejection
- Seller category revocation
- Category commission configuration
- Category access validation required by other modules

The module provides the controlled business boundary for category-related
operations.

The module must ensure that:

- Sellers can operate only within categories approved for them.
- Sellers cannot create marketplace categories.
- Super Admin controls marketplace categories.
- Super Admin controls seller category approval and revocation.
- Every category has a commission configuration.
- Commission changes apply only to future orders.
- Historical order commission must not be changed by current commission
  configuration.

---

# 2. Category Management Entities

The Category & Commission API primarily works with:

- Category
- Seller Category
- Category Commission
- Seller Profile
- User
- Role
- Audit Log
- Activity Log

The primary entities owned by this module are:

```text
Category Management
        |
        +── Category
        |
        +── Seller Category
        |
        └── Category Commission 


 Related entities owned by other modules may be accessed only through
defined business operations and interfaces.

3. Category Responsibilities

The Category Management module owns the following business capabilities:

3.1 Category Management
Create marketplace categories.
Create/manage category hierarchy.
Support subcategories.
Make categories available for marketplace use.
3.2 Seller Category Management
Receive seller category requests.
Review seller category requests.
Approve category requests.
Reject category requests.
Revoke previously granted category permissions.
Maintain seller-category relationships.
3.3 Commission Configuration
Maintain commission configuration for categories.
Allow Super Admin to update category commission percentages.
Ensure new commission configuration applies to future orders.
Preserve historical commission behavior.
3.4 Category Authorization Support

The module exposes business operations that allow other modules,
particularly Product Management, to determine whether a seller has
permission to operate within a category.

4. Category Lifecycle

The exact lifecycle/status values must remain synchronized with the
Category entity specification.

The API must not independently introduce category status values that
contradict the approved database/entity design.

Conceptually:

Category Created
       |
       v
Marketplace Category
       |
       +---- Parent Category
       |
       +---- Subcategory

The category hierarchy must support:

Category
   |
   +── Subcategory
   |
   +── Subcategory
   |
   +── Subcategory

The exact hierarchy depth and supported fields must remain synchronized
with the Category entity specification.

5. Seller Category Lifecycle

Seller category access is controlled independently from the existence
of the marketplace category itself.

Conceptually:

Seller
   |
   v
Category Request
   |
   v
Super Admin Review
   |
   +───────────────+
   |               |
   v               v
Approved        Rejected
   |
   v
Seller Category Permission
   |
   v
Seller Can Operate
Within Category
   |
   v
Super Admin Revokes
   |
   v
Category Permission Removed/Deactivated

Important rules:

Sellers may request one or more categories.
Sellers may request additional categories after approval.
Every new category request requires separate approval.
Approval of one category must not automatically approve another.
A seller cannot approve their own category request.
The Super Admin may revoke category permission at any time.
Sellers may operate only within approved categories.

These rules are defined by the SRS.

6. Category API Endpoints

The Category Management module contains the following primary
business endpoints.

Method	Endpoint	Purpose	Primary Actor
GET	/api/v1/categories	List marketplace categories	Public / Customer
GET	/api/v1/categories/:categoryId	Get category details	Public / Customer
POST	/api/v1/admin/categories	Create marketplace category	Super Admin
PATCH	/api/v1/admin/categories/:categoryId	Update marketplace category	Super Admin
DELETE	/api/v1/admin/categories/:categoryId	Deactivate marketplace category	Super Admin
GET	/api/v1/sellers/me/categories/available	View categories available for request	Seller
POST	/api/v1/sellers/me/category-requests	Request category access	Seller
GET	/api/v1/sellers/me/category-requests	View own category requests	Seller
GET	/api/v1/sellers/me/categories	View approved category permissions	Seller
GET	/api/v1/admin/category-requests	View seller category requests	Super Admin
GET	/api/v1/admin/category-requests/:requestId	View category request details	Super Admin
POST	/api/v1/admin/category-requests/:requestId/approve	Approve category request	Super Admin
POST	/api/v1/admin/category-requests/:requestId/reject	Reject category request	Super Admin
DELETE	/api/v1/admin/sellers/:sellerId/categories/:categoryId	Revoke seller category permission	Super Admin
GET	/api/v1/admin/categories/:categoryId/commission	View category commission	Super Admin
PUT	/api/v1/admin/categories/:categoryId/commission	Configure/update category commission	Super Admin

The exact endpoint list must remain synchronized with the approved API
resource/module mapping and the final entity specifications.

7. Public Category APIs
7.1 List Categories
Endpoint
GET /api/v1/categories
Purpose

Returns marketplace categories available for browsing.

Actor

Public / Customer.

Authentication

Not required unless the final marketplace browsing rules introduce
authentication requirements.

Authorization

No administrative authorization is required.

Query Parameters

Supported filtering, pagination, and sorting parameters must follow the
global API conventions defined in api-design.md.

Examples may include:

?page=1
&pageSize=20

The exact supported parameters must be finalized according to the master
API specification.

Validation Rules
Pagination parameters must follow global validation rules.
Only categories eligible for marketplace display should be returned.
Internal administrative information must not be exposed.
Business Rules
Categories are marketplace-managed resources.
Sellers cannot create marketplace categories.
Categories may contain subcategories.
Products from multiple sellers may exist within the same category.
Success Response
200 OK

Example:

{
  "success": true,
  "data": {
    "categories": []
  },
  "message": "Categories retrieved successfully"
}
Error Responses
400 Bad Request

Invalid query parameters.

Side Effects

None.

Related Entities
Category
Idempotency

Not applicable.

8. Get Category Details
Endpoint
GET /api/v1/categories/:categoryId
Purpose

Returns details of a marketplace category.

Actor

Public / Customer.

Authentication

Not required unless the final marketplace browsing rules require it.

Authorization

No administrative authorization is required.

Validation Rules
Category ID must be valid.
Category must exist.
Category must be eligible for the requested operation.
Business Rules
Category hierarchy must be represented according to the Category entity.
Internal administrative information must not be exposed.
Success Response
200 OK

Example:

{
  "success": true,
  "data": {
    "category": {}
  },
  "message": "Category retrieved successfully"
}
Error Responses
404 Not Found

Category does not exist.

Side Effects

None.

Related Entities
Category
Idempotency

Not applicable.

9. Create Category — Admin
Endpoint
POST /api/v1/admin/categories
Purpose

Creates a marketplace category or subcategory.

Actor

Super Admin.

Authentication

Required.

Authorization

Super Admin only.

Request Body

The exact request fields must remain synchronized with the Category entity
specification.

Conceptually, the request must provide the information required to create
a marketplace category and, where supported, establish its parent-child
relationship.

Example:

{
  "name": "Electronics",
  "parentCategoryId": null
}

The exact fields above are illustrative only. The final request schema
must be derived from the approved Category entity specification.

Validation Rules
Requesting user must be authenticated.
Requesting user must have Super Admin authorization.
Required category information must be provided.
Category data must satisfy configured validation rules.
Parent category, if supplied, must exist.
Parent-child relationship must be valid.
Category hierarchy rules must be respected.
Duplicate categories must be prevented according to the approved
category uniqueness rules.
Business Rules
Only Super Admin can create marketplace categories.
Sellers cannot create marketplace categories.
Categories may contain subcategories.
Multiple sellers may operate within the same category after approval.
Success Response
201 Created

Example:

{
  "success": true,
  "data": {
    "category": {}
  },
  "message": "Category created successfully"
}
Error Responses
400 Bad Request
401 Unauthorized
403 Forbidden
409 Conflict
422 Unprocessable Entity
Side Effects
Category is created.
Category hierarchy may be updated.
Activity Log may be created.
Audit Log should be created for administrative category creation.
Related Entities
Category
Audit Log
Activity Log
Idempotency

Category creation must prevent unintended duplicate category creation.

If the global API architecture introduces idempotency keys for this
operation, the operation must support them.

10. Update Category — Admin
Endpoint
PATCH /api/v1/admin/categories/:categoryId
Purpose

Updates an existing marketplace category.

Actor

Super Admin.

Authentication

Required.

Authorization

Super Admin only.

Request Body

Only fields defined as mutable by the Category entity specification may
be updated.

Example:

{
  "name": "Consumer Electronics"
}

The exact mutable fields must remain synchronized with the Category entity.

Validation Rules
Category must exist.
Requesting user must be Super Admin.
Updated fields must satisfy category validation rules.
Parent category changes must preserve hierarchy integrity.
Invalid circular parent relationships must be rejected where hierarchy
supports parent references.
Unsupported fields must be rejected.
Business Rules
Only Super Admin can modify marketplace category configuration.
Updating a category must not corrupt historical marketplace records.
Category changes must not silently alter historical order records.
Success Response
200 OK

Example:

{
  "success": true,
  "data": {
    "category": {}
  },
  "message": "Category updated successfully"
}
Error Responses
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
Side Effects
Category is updated.
Activity Log may be created.
Audit Log should be created for important administrative changes.
Related Entities
Category
Audit Log
Activity Log
Idempotency

Submitting the same resulting values should not create additional
business effects beyond the defined update/audit behavior.

11. Deactivate Category — Admin
Endpoint
DELETE /api/v1/admin/categories/:categoryId
Purpose

Deactivates/removes a marketplace category according to the application's
logical deletion policy.

Actor

Super Admin.

Authentication

Required.

Authorization

Super Admin only.

Validation Rules
Category must exist.
Requesting user must be Super Admin.
Category must be eligible for deactivation.
Existing relationships must be evaluated before deactivation.
The operation must respect historical data requirements.
Business Rules

The global API design specifies logical deletion for entities requiring
historical tracking, including categories.

Therefore, category deletion must not automatically mean permanent
physical deletion.

Existing products, seller permissions, orders, reports, and historical
records must not be silently corrupted.

Success Response
200 OK

Example:

{
  "success": true,
  "data": null,
  "message": "Category deactivated successfully"
}
Error Responses
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
Side Effects
Category is deactivated according to the approved deletion policy.
Future marketplace operations may no longer use the category.
Audit Log should record the administrative action.
Related Entities
Category
Seller Category
Audit Log
Activity Log
Idempotency

Deactivating an already deactivated category should not create another
business effect.

12. Get Available Categories — Seller
Endpoint
GET /api/v1/sellers/me/categories/available
Purpose

Returns marketplace categories that the authenticated seller may request.

Actor

Seller.

Authentication

Required.

Authorization

Only the authenticated seller may access their seller-specific category
request context.

Validation Rules
Seller must be authenticated.
Seller profile must exist.
Seller must satisfy the conditions required to request categories.
Business Rules
Sellers may request one or more categories.
Sellers may request additional categories after approval.
Already approved/assigned categories should not be presented as new
requests where the business rules prohibit duplicate requests.
Success Response
200 OK

Example:

{
  "success": true,
  "data": {
    "categories": []
  },
  "message": "Available categories retrieved successfully"
}
Error Responses
401 Unauthorized
404 Not Found
403 Forbidden
Side Effects

None.

Related Entities
Seller Profile
Seller Category
Category
Idempotency

Not applicable.

13. Request Category Access — Seller
Endpoint
POST /api/v1/sellers/me/category-requests
Purpose

Allows an authenticated seller to request permission to sell within one
or more marketplace categories.

Actor

Seller.

Authentication

Required.

Authorization

The request must be made for the authenticated seller only.

Request Body

The request must identify the category or categories requested.

Example:

{
  "categoryIds": [
    "category-id-1",
    "category-id-2"
  ]
}

The final field names and structure must remain synchronized with the
Seller Category entity specification and approved API conventions.

Validation Rules
Seller must be authenticated.
Seller profile must exist.
Seller must be eligible to request categories.
Every requested category must exist.
Every requested category must be eligible for seller assignment.
Duplicate requests must be prevented.
Categories already approved for the seller must not be requested again
where the business rules prohibit duplicate requests.
Business Rules
Sellers may request multiple categories.
Each category requires separate approval.
Approval of one category must not automatically approve another.
Seller category access is not granted merely by submitting the request.
The Super Admin controls approval.
Success Response
201 Created

Example:

{
  "success": true,
  "data": {
    "requests": []
  },
  "message": "Category request submitted successfully"
}
Error Responses
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
Side Effects
Seller Category request record is created or updated according to the
approved entity lifecycle.
Activity Log may be created.
No category permission is granted automatically.
Related Entities
Seller Profile
Seller Category
Category
Activity Log
Idempotency

Repeated submission of the same category request must not create duplicate
seller-category request records or duplicate business effects.

14. Get Own Category Requests — Seller
Endpoint
GET /api/v1/sellers/me/category-requests
Purpose

Returns category requests belonging to the authenticated seller.

Actor

Seller.

Authentication

Required.

Authorization

Only the authenticated seller may access their category requests.

Validation Rules
Seller must be authenticated.
Seller profile must exist.
Returned requests must belong to the authenticated seller.
Business Rules

A seller must not be able to access another seller's category requests.

Success Response
200 OK

Example:

{
  "success": true,
  "data": {
    "requests": []
  },
  "message": "Category requests retrieved successfully"
}
Error Responses
401 Unauthorized
403 Forbidden
404 Not Found
Side Effects

None.

Related Entities
Seller Profile
Seller Category
Category
Idempotency

Not applicable.

15. Get Own Approved Categories — Seller
Endpoint
GET /api/v1/sellers/me/categories
Purpose

Returns categories currently approved/assigned to the authenticated
seller.

Actor

Seller.

Authentication

Required.

Authorization

Only the authenticated seller may access their category assignments.

Validation Rules
Seller must be authenticated.
Seller profile must exist.
Returned assignments must belong to the authenticated seller.
Business Rules
Seller cannot assign categories to themselves.
Only categories approved through the appropriate administrative
workflow may be used.
Product creation must respect approved category permissions.
Success Response
200 OK

Example:

{
  "success": true,
  "data": {
    "categories": []
  },
  "message": "Seller categories retrieved successfully"
}
Error Responses
401 Unauthorized
403 Forbidden
404 Not Found
Side Effects

None.

Related Entities
Seller Profile
Seller Category
Category
Idempotency

Not applicable.

16. Get Category Requests — Admin
Endpoint
GET /api/v1/admin/category-requests
Purpose

Returns seller category requests for administrative review.

Actor

Super Admin.

Authentication

Required.

Authorization

Super Admin only.

Query Parameters

The endpoint should support the global pagination, filtering, and sorting
conventions.

Possible business filters may include request state, seller, and category,
provided those fields exist in the approved entity/API design.

Validation Rules
Requesting user must be Super Admin.
Query parameters must satisfy global validation rules.
Business Rules
Super Admin may review pending category requests.
Administrative responses must not expose unnecessary sensitive seller
information.
Success Response
200 OK

Example:

{
  "success": true,
  "data": {
    "requests": []
  },
  "message": "Category requests retrieved successfully"
}
Error Responses
401 Unauthorized
403 Forbidden
422 Unprocessable Entity
Side Effects

None.

Related Entities
Seller Profile
Seller Category
Category
User
Role
Idempotency

Not applicable.

17. Get Category Request Details — Admin
Endpoint
GET /api/v1/admin/category-requests/:requestId
Purpose

Returns the details required for Super Admin review of a seller category
request.

Actor

Super Admin.

Authentication

Required.

Authorization

Super Admin only.

Validation Rules
Requesting user must be Super Admin.
Request ID must be valid.
Category request must exist.
Success Response
200 OK

Example:

{
  "success": true,
  "data": {
    "request": {}
  },
  "message": "Category request retrieved successfully"
}
Error Responses
403 Forbidden
404 Not Found
Side Effects

None.

Related Entities
Seller Category
Seller Profile
Category
User
Role
Idempotency

Not applicable.

18. Approve Category Request — Admin
Endpoint
POST /api/v1/admin/category-requests/:requestId/approve
Purpose

Approves a seller's request to operate within a marketplace category.

Actor

Super Admin.

Authentication

Required.

Authorization

Super Admin only.

Validation Rules
Category request must exist.
Seller must exist.
Category must exist.
Request must be in an approvable state.
Requesting user must be Super Admin.
Seller must satisfy any prerequisite conditions required by the SRS.
Duplicate approved seller-category assignments must be prevented.
Business Rules
Only Super Admin can approve category requests.
Approval applies only to the requested category.
Approval of one category does not approve other categories.
Seller receives permission only after successful approval.
Approval must be auditable.
Success Response
200 OK

Example:

{
  "success": true,
  "data": {
    "sellerCategory": {}
  },
  "message": "Category request approved successfully"
}
Error Responses
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
Side Effects
Seller Category permission becomes approved/active according to the
entity lifecycle.
Seller's permitted category scope changes.
Audit Log must be created.
Activity Log may be created.
Notification may be generated for the seller.
Related Entities
Seller Profile
Seller Category
Category
Audit Log
Activity Log
Notification
Idempotency

Approving an already approved request must not create another business
effect.

19. Reject Category Request — Admin
Endpoint
POST /api/v1/admin/category-requests/:requestId/reject
Purpose

Rejects a seller's request to operate within a marketplace category.

Actor

Super Admin.

Authentication

Required.

Authorization

Super Admin only.

Request Body

A rejection reason should be supplied where required by the approved
business workflow.

Example:

{
  "reason": "Seller does not satisfy the marketplace requirements for this category."
}

The final request structure must remain synchronized with the Seller
Category entity and approved business workflow.

Validation Rules
Category request must exist.
Seller must exist.
Category must exist.
Request must be in a rejectable state.
Rejection reason must be provided where required.
Rejection reason must satisfy configured validation rules.
Requesting user must be Super Admin.
Business Rules
Only Super Admin can reject category requests.
Rejection does not delete the seller.
Rejection does not delete the marketplace category.
Seller may submit another request where permitted by the business rules.
Rejection must be auditable.
Success Response
200 OK

Example:

{
  "success": true,
  "data": {
    "request": {}
  },
  "message": "Category request rejected successfully"
}
Error Responses
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
Side Effects
Category request state is updated.
Rejection reason is stored where supported by the entity model.
Audit Log must be created.
Activity Log may be created.
Notification may be generated for the seller.
Related Entities
Seller Profile
Seller Category
Category
Audit Log
Activity Log
Notification
Idempotency

Rejecting an already rejected request with the same resulting state must
not create another business effect.

20. Revoke Seller Category Permission — Admin
Endpoint
DELETE /api/v1/admin/sellers/:sellerId/categories/:categoryId
Purpose

Revokes a seller's permission to operate within a marketplace category.

Actor

Super Admin.

Authentication

Required.

Authorization

Super Admin only.

Validation Rules
Seller must exist.
Category must exist.
Seller-category relationship must exist.
Requesting user must be Super Admin.
Business Rules
Only Super Admin can revoke seller category permission.
Sellers cannot revoke their own administrative category permissions.
Revocation affects future seller operations.
Revocation must not silently invalidate historical orders.
Historical product/order/financial records must remain consistent.
Category permission changes must be auditable.
Success Response
200 OK

Example:

{
  "success": true,
  "data": null,
  "message": "Seller category permission revoked successfully"
}
Error Responses
403 Forbidden
404 Not Found
409 Conflict
Side Effects
Seller Category assignment is removed/deactivated according to the
approved entity lifecycle.
Seller's future category operations may be restricted.
Existing historical records remain unchanged.
Audit Log must be created.
Activity Log may be created.
Related Entities
Seller Profile
Seller Category
Category
Audit Log
Activity Log
Idempotency

Revoking an already revoked/deactivated assignment must not create another
business effect.

21. Category Commission Management

The Category Commission entity stores the commission percentage associated
with a category.

The Category Management module owns the commission configuration.

However, the Settlement Management module owns commission calculation
during settlement/order-related financial processing.

Therefore:

Category Management
        |
        | Commission Configuration
        v
Category Commission
        |
        | Configuration consumed by
        v
Settlement Management
        |
        | Commission Calculation
        v
Order / Settlement

The API must not move commission calculation logic into the Category
Management API.

22. Get Category Commission — Admin
Endpoint
GET /api/v1/admin/categories/:categoryId/commission
Purpose

Returns the current commission configuration for a marketplace category.

Actor

Super Admin.

Authentication

Required.

Authorization

Super Admin only.

Validation Rules
Category must exist.
Requesting user must be Super Admin.
Commission configuration must exist according to the database/business
rules.
Business Rules
Every category shall have its own commission percentage.
The commission percentage represents the marketplace commission for
that category.
Current commission configuration must not be used to rewrite historical
order commission.
Success Response
200 OK

Example:

{
  "success": true,
  "data": {
    "categoryId": "category-id",
    "commission": {}
  },
  "message": "Category commission retrieved successfully"
}
Error Responses
403 Forbidden
404 Not Found
Side Effects

None.

Related Entities
Category
Category Commission
Idempotency

Not applicable.

23. Update Category Commission — Admin
Endpoint
PUT /api/v1/admin/categories/:categoryId/commission
Purpose

Creates or updates the commission configuration for a marketplace
category.

Actor

Super Admin.

Authentication

Required.

Authorization

Super Admin only.

Request Body

The exact commission field must remain synchronized with the
Category Commission entity specification.

Conceptually:

{
  "commissionPercentage": 10
}

The exact field name, precision, numeric representation, range, and other
constraints must be taken from the approved Category Commission entity
specification.

Validation Rules
Category must exist.
Requesting user must be Super Admin.
Commission value must be provided.
Commission value must be numeric according to the entity definition.
Commission value must satisfy the configured valid range.
Precision/scale must follow the database/entity specification.
Invalid negative or otherwise unsupported values must be rejected.
Request must contain only supported fields.
Business Rules
Every category has a commission percentage.
Commission is calculated as a percentage of the product selling price.
Super Admin may modify commission percentages.
Updated commission values apply only to future orders.
Completed orders retain the commission rate applicable at purchase time.
Changing the current Category Commission configuration must never
recalculate historical orders.
Success Response
200 OK

Example:

{
  "success": true,
  "data": {
    "categoryId": "category-id",
    "commission": {}
  },
  "message": "Category commission updated successfully"
}
Error Responses
400 Bad Request
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
Side Effects
Current Category Commission configuration is updated.
Future commission calculations use the new configuration.
Historical order commission remains unchanged.
Audit Log must record the commission change.
Activity Log may also be created.
Related Entities
Category
Category Commission
Audit Log
Activity Log
Idempotency

Submitting the same commission configuration should not create an
additional business effect beyond the defined update/audit behavior.

24. Commission Historical Data Rule

The API must enforce the historical-data rule defined by the master API
design.

Example:

Current Commission
      |
      | Before change
      v
      10%


Order A
Commission = 10%

Later:

Super Admin changes commission
10% → 15%

The result must be:

Category Commission
Current = 15%


Order A
Historical Commission = 10%


Future Order B
Commission = 15%

The current Category Commission value must never be used to rewrite
historical order commission.

Historical commission values belong to the financial/order snapshot
mechanism defined by the Order/Order Item and Settlement design.

The API must therefore not expose an operation that recalculates historical
orders merely because the current category commission changed.

25. Category Authorization Rules

The following authorization rules apply.

Operation	Public	Customer	Seller	Super Admin
View marketplace categories	Yes	Yes	Yes	Yes
View category details	Yes	Yes	Yes	Yes
Create category	No	No	No	Yes
Update category	No	No	No	Yes
Deactivate category	No	No	No	Yes
View available categories	No	No	Yes	Yes
Request category	No	No	Yes	No
View own category requests	No	No	Yes	No
View own approved categories	No	No	Yes	No
View all category requests	No	No	No	Yes
Approve category request	No	No	No	Yes
Reject category request	No	No	No	Yes
Revoke seller category	No	No	No	Yes
View category commission	No	No	No	Yes
Update category commission	No	No	No	Yes

This matrix must remain synchronized with the global RBAC rules defined in
docs/api-design.md.

26. Seller Ownership Rules

Seller category operations must enforce ownership server-side.

A seller:

Can view their own category requests.
Can view their own approved category permissions.
Can request categories for themselves.
Cannot request categories on behalf of another seller.
Cannot approve their own category requests.
Cannot reject their own category requests.
Cannot assign categories directly to themselves through administrative
APIs.
Cannot revoke administrative category permissions.
Cannot access another seller's private category request information.

The backend must never rely solely on a seller ID supplied by the client
to establish ownership.

The authenticated identity must be used to establish seller ownership.

27. Category Business Rules

The following rules are mandatory.

BR-CAT-01

Only Super Admin can create marketplace categories.

BR-CAT-02

Categories may contain subcategories.

BR-CAT-03

Multiple sellers may operate within the same marketplace category.

BR-CAT-04

Products belonging to different sellers may appear within the same
marketplace category.

BR-CAT-05

A seller cannot create marketplace categories.

BR-CAT-06

A seller may request one or more selling categories.

BR-CAT-07

A seller may request additional categories after approval.

BR-CAT-08

Every new category request requires separate approval.

BR-CAT-09

Approval of one category does not automatically approve other categories.

BR-CAT-10

Only approved category permissions allow a seller to operate within that
category.

BR-CAT-11

Super Admin may revoke seller category permission.

BR-CAT-12

Category permission changes must not corrupt historical marketplace
records.

28. Commission Business Rules
BR-COM-01

Every category shall have its own commission percentage.

BR-COM-02

Commission is calculated as a percentage of the product selling price.

BR-COM-03

Super Admin may modify category commission percentages.

BR-COM-04

Updated commission values apply only to future orders.

BR-COM-05

Completed orders retain the commission rate applicable at the time of
purchase.

BR-COM-06

Current commission configuration must not be used to recalculate
historical order commission.

BR-COM-07

Commission changes must be auditable.

BR-COM-08

Commission calculation itself belongs to Settlement Management and must
not be duplicated inside Category Management.

29. Category Security Rules

Category APIs must follow the global API security rules.

Additional requirements:

Administrative category operations require Super Admin authorization.
Sellers cannot modify marketplace category configuration.
Seller ownership must be checked server-side.
Seller category permissions must be checked server-side.
Client-provided seller IDs must not bypass authorization.
Sensitive administrative information must not be exposed.
Internal database structure must not be exposed.
Authorization must never depend only on frontend restrictions.
30. Audit Requirements

The following operations must be auditable:

Category creation
Category modification
Category deactivation
Seller category approval
Seller category rejection
Seller category revocation
Commission creation
Commission modification

The Audit Log should capture the information required by the global audit
design, including the actor, operation, affected resource, and relevant
change information.

Sensitive authentication information must never be recorded.

31. Activity Logging Requirements

Activity Log records may be created for general marketplace activities.

Examples:

Seller submits category request.
Seller views category information.
Super Admin reviews category request.
Super Admin approves category request.
Super Admin rejects category request.
Super Admin changes category configuration.

Activity logging must follow the global logging rules and must not expose
credentials or other sensitive information.

32. Cross-Module Interaction

Category Management interacts with other modules through defined business
interfaces.

32.1 Seller Management
Seller Management
       |
       | Seller identity/profile
       v
Category Management
       |
       | Seller Category Permission
       v
Seller Marketplace Access

Category Management must not directly access Seller Management's internal
repositories.

32.2 Product Management

Product creation requires category authorization.

Seller
   |
   v
Product Management
   |
   | Validate category permission
   v
Category Management
   |
   | Approved / Not Approved
   v
Product Management

Category Management should expose a business-level operation such as:

CanSellerOperateInCategory(
    sellerId,
    categoryId
)

The exact internal service/interface contract will be defined during
implementation.

Product Management must not directly access Seller Category database
tables.

32.3 Settlement Management

Category Management owns commission configuration.

Settlement Management owns commission calculation.

Category Management
        |
        | Current Commission Configuration
        v
Settlement Management
        |
        | Commission Calculation
        v
Order / Settlement

The Category Management API must not duplicate settlement calculation
logic.

32.4 Notification Management

Category operations may trigger notifications.

Examples:

Category Request Approved
        ↓
Notification Management
        ↓
Seller Notification
Category Request Rejected
        ↓
Notification Management
        ↓
Seller Notification

Notification delivery failure should not automatically roll back the
primary category operation unless the approved business workflow explicitly
requires notification success.

33. Category API Error Codes

The following application-level error codes may be used.

Error Code	Meaning
CATEGORY_NOT_FOUND	Category does not exist
CATEGORY_ALREADY_EXISTS	Duplicate category detected
INVALID_CATEGORY	Category data is invalid
INVALID_CATEGORY_HIERARCHY	Category hierarchy is invalid
CATEGORY_NOT_AVAILABLE	Category cannot be used for the requested operation
SELLER_NOT_FOUND	Seller does not exist
SELLER_NOT_APPROVED	Seller is not approved
CATEGORY_REQUEST_NOT_FOUND	Category request does not exist
CATEGORY_REQUEST_ALREADY_EXISTS	Duplicate category request
CATEGORY_REQUEST_NOT_APPROVABLE	Request cannot be approved
CATEGORY_REQUEST_NOT_REJECTABLE	Request cannot be rejected
CATEGORY_ALREADY_ASSIGNED	Seller already has the category
CATEGORY_PERMISSION_NOT_FOUND	Seller-category permission does not exist
CATEGORY_PERMISSION_ALREADY_REVOKED	Permission is already revoked
ADMIN_AUTHORIZATION_REQUIRED	Super Admin authorization required
SELLER_ACCESS_DENIED	Seller cannot access the resource
COMMISSION_NOT_FOUND	Commission configuration does not exist
INVALID_COMMISSION	Commission value is invalid
COMMISSION_UPDATE_NOT_ALLOWED	Commission update is not allowed
VALIDATION_ERROR	Request validation failed

Final error codes must remain synchronized with the global API error
conventions.

34. Idempotency Summary
Operation	Idempotency Behavior
Create Category	Duplicate category creation must be prevented
Update Category	Same resulting state should be safely repeatable
Deactivate Category	Repeated deactivation must not create another business effect
Request Category	Duplicate requests must be prevented
Approve Category Request	Repeated approval must not create another business effect
Reject Category Request	Repeated rejection with same state/reason must not create another business effect
Revoke Category	Repeated revocation must not create another business effect
Update Commission	Same resulting configuration should not create another business effect beyond defined audit behavior

The final idempotency mechanism must remain synchronized with the global
API architecture.

35. Validation Summary

Every Category & Commission API must perform:

Authentication
      ↓
Authorization
      ↓
Request Validation
      ↓
Resource Existence Validation
      ↓
Ownership Validation
      ↓
Business Rule Validation
      ↓
Database Constraint Validation
      ↓
Business Operation
      ↓
Side Effects
      ↓
Audit / Activity Logging

The frontend must never be trusted to enforce category permissions,
commission rules, or administrative authorization.

36. Historical Data Protection

Category and commission changes must not corrupt historical business
records.

The following must remain true:

Current Category Configuration
            ≠
Historical Order Configuration

Changing:

Category Commission
10% → 15%

must not change:

Historical Order A
Commission = 10%

The new value applies only to future applicable orders.

Historical financial information must remain traceable for:

Orders
Order Items
Commission
Refunds
Settlements
Reports
37. Completion Criteria

Category & Commission API design is considered complete when:

Marketplace category APIs are documented.
Category hierarchy behavior is documented.
Seller category request APIs are documented.
Seller category approval is documented.
Seller category rejection is documented.
Seller category revocation is documented.
Seller category ownership rules are defined.
Category commission APIs are documented.
Commission update rules are defined.
Historical commission behavior is defined.
RBAC rules are defined.
Validation rules are defined.
Business rules are defined.
Success responses are defined.
Error responses are defined.
Side effects are defined.
Idempotency behavior is defined.
Audit requirements are defined.
Cross-module interactions are defined.
Category APIs remain synchronized with database entities.
Category APIs remain synchronized with the SRS.
Category APIs remain synchronized with business workflows.
Category APIs remain synchronized with docs/api-design.md.
38. Related Documents

This document must remain synchronized with:

docs/SRS.md
docs/module-identification.md
docs/architecture.md
docs/database-design.md
docs/api-design.md
docs/api/authentication.md
docs/api/seller-management.md
docs/business-workflows.md
context/business-glossary.md
docs/entities/10-Category.md
docs/entities/11-Seller-Category.md
docs/entities/12-Category-Commission.md

Any change to:

Category
Seller Category
Category Commission
Seller Profile
Product category rules
Commission rules
Settlement rules

must be reviewed against this API document.

39. Category & Commission API Summary

The Category & Commission API provides the controlled business boundary
for marketplace category management.

                    CATEGORY MANAGEMENT


                         Category
                            |
             +--------------+--------------+
             |                             |
             v                             v
       Marketplace                  Seller Category
       Categories                    Permissions
             |                             |
             |                             |
             v                             v
       Subcategories                 Seller Request
                                           |
                                           v
                                    Super Admin Review
                                           |
                                  +--------+--------+
                                  |                 |
                                  v                 v
                              Approved          Rejected
                                  |
                                  v
                         Seller Can Operate
                         Within Category
                                  |
                                  v
                            Product Module

Commission configuration is managed separately:

                    Category
                       |
                       v
               Category Commission
                       |
                       | configuration
                       v
              Settlement Management
                       |
                       | calculation
                       v
                    Order /
                   Settlement

The Category Management module owns category and commission configuration
while Settlement Management owns commission calculation.

The API must preserve the separation of business responsibilities defined
by the marketplace architecture.



### One important thing before you paste this into your project


There is **one overlap I deliberately want you to be aware of**: your existing `seller-management.md` already contains these endpoints:


```text
GET    /api/v1/sellers/me/categories
GET    /api/v1/admin/sellers/:sellerId/categories
POST   /api/v1/admin/sellers/:sellerId/categories
DELETE /api/v1/admin/sellers/:sellerId/categories/:categoryId

But your API roadmap explicitly says that Category & Commission APIs cover Category, Seller Category, and Category Commission, and your architecture says Category Management owns seller category approvals.

So I would not blindly keep two different implementations of seller-category management.

The clean boundary should be:

Seller Management
    → seller profile / seller verification


Category Management
    → categories
    → seller category requests
    → approval/rejection
    → category permission
    → commission configuration


Settlement Management
    → commission calculation
    → settlement calculation

Your existing seller-management document can then reference Category Management for category operations, rather than owning the same business logic twice. This follows your own module principle that every business responsibility should belong to one module and that modules should communicate through controlled interfaces.

Also, I have intentionally not hard-coded exact Category/Seller Category/Category Commission fields or status enums because the retrieved database-design source only establishes their purpose/ownership, while your master API rules say the detailed API contract must stay synchronized with the entity specifications.

This is the safer approach for the AI-agent workflow you're building: the API document defines business contracts; the entity Markdown files remain the authority for persistence-level fields.

