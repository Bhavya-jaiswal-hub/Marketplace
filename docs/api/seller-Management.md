Seller Management API
Document Information
Field	Value
Document Name	Seller Management API
Product	Multi-Vendor Marketplace
API Version	v1
Status	Draft
Parent Document	API Design
Related Document	Authentication API
Last Updated	DD-MM-YYYY
1. Overview

The Seller Management API manages the complete seller lifecycle within the marketplace.

It is responsible for:

Seller onboarding
Seller profile management
Seller address management
Seller document management
Seller verification
Seller status management
Seller category management
Seller access to seller-owned marketplace operations

The Seller Management module must ensure that only eligible and verified sellers can perform marketplace operations that require seller approval.

2. Seller Management Entities

The Seller Management API primarily works with:

User
Role
Seller Profile
Seller Address
Seller Document
Seller Category
Category
Activity Log
Audit Log

Relationship:

User
 │
 └── Seller Profile
       │
       ├── Seller Address
       │
       ├── Seller Document
       │
       └── Seller Category
                │
                └── Category
3. Seller Lifecycle

A seller moves through controlled lifecycle states.

User Registration
       │
       ▼
Seller Onboarding
       │
       ▼
Seller Profile
       │
       ▼
Seller Address / Documents
       │
       ▼
Verification Pending
       │
       ├──────────────► Rejected
       │                   │
       │                   ▼
       │              Resubmission
       │                   │
       │                   └──────► Verification Pending
       │
       ▼
Approved
       │
       ▼
Seller Marketplace Operations

The exact seller status values must remain synchronized with the Seller Profile entity.

4. Seller API Endpoints

The Seller Management module contains the following primary endpoints:

Method	Endpoint	Purpose	Primary Actor
POST	/api/v1/sellers	Create seller onboarding/profile	Customer
GET	/api/v1/sellers/me	Get own seller profile	Seller
PATCH	/api/v1/sellers/me	Update own seller profile	Seller
GET	/api/v1/sellers/me/addresses	Get seller addresses	Seller
POST	/api/v1/sellers/me/addresses	Add seller address	Seller
GET	/api/v1/sellers/me/addresses/:addressId	Get seller address	Seller
PATCH	/api/v1/sellers/me/addresses/:addressId	Update seller address	Seller
DELETE	/api/v1/sellers/me/addresses/:addressId	Remove seller address	Seller
GET	/api/v1/sellers/me/documents	Get submitted documents	Seller
POST	/api/v1/sellers/me/documents	Submit seller document	Seller
GET	/api/v1/sellers/me/status	Get seller verification status	Seller
GET	/api/v1/admin/sellers	List sellers for administration	Super Admin
GET	/api/v1/admin/sellers/:sellerId	Get seller details	Super Admin
PATCH	/api/v1/admin/sellers/:sellerId/status	Change seller status	Super Admin
POST	/api/v1/admin/sellers/:sellerId/approve	Approve seller	Super Admin
POST	/api/v1/admin/sellers/:sellerId/reject	Reject seller	Super Admin
GET	/api/v1/sellers/me/categories	Get seller categories	Seller
GET	/api/v1/admin/sellers/:sellerId/categories	Get seller categories	Super Admin
POST	/api/v1/admin/sellers/:sellerId/categories	Assign category to seller	Super Admin
DELETE	/api/v1/admin/sellers/:sellerId/categories/:categoryId	Remove category from seller	Super Admin

The exact endpoint list may evolve as Product Management and Category Management APIs are finalized.

5. Create Seller
Endpoint
POST /api/v1/sellers
Purpose

Creates the seller onboarding/profile record for an authenticated user who wants to become a seller.

Actor
Customer
Authentication

Required.

Authorization

Only an authenticated user who is eligible for seller onboarding may create a seller profile.

A user must not create a seller profile for another user.

Request Body

Example:

{
  "businessName": "ABC Electronics",
  "businessDescription": "Electronics and accessories marketplace seller"
}

The exact fields must remain synchronized with the Seller Profile entity.

Validation Rules
User must be authenticated.
User must exist.
User must be eligible for seller onboarding.
A user must not have multiple active seller profiles where the business rules prohibit it.
Mandatory seller profile fields must be provided.
Business information must satisfy configured validation rules.
Request must contain only supported fields.
Business Rules
Seller onboarding begins with an authenticated marketplace user.
Seller creation does not automatically mean seller approval.
Seller must complete required onboarding information before verification.
Seller must provide required address and verification information.
Seller cannot perform restricted seller operations before approval.
Seller verification is controlled by the Super Admin.
A user cannot create a seller profile for another user.
Success Response
Status
201 Created

Example:

{
  "success": true,
  "data": {
    "seller": {
      "id": "seller-id",
      "userId": "user-id",
      "businessName": "ABC Electronics",
      "status": "Pending"
    }
  },
  "message": "Seller onboarding created successfully"
}
Error Responses
401 Unauthorized
Authentication required.
409 Conflict
Seller profile already exists.
422 Unprocessable Entity
Seller information is invalid.
Side Effects
Seller Profile is created.
Initial seller status is established.
Seller onboarding activity may be recorded.
Related Entities
User
Role
Seller Profile
Activity Log
Idempotency

Seller creation should prevent duplicate seller profiles for the same user.

6. Get Own Seller Profile
Endpoint
GET /api/v1/sellers/me
Purpose

Returns the authenticated seller's profile information.

Actor
Seller
Authentication

Required.

Authorization

Only the authenticated seller may access their own seller profile through this endpoint.

Request

No request body is required.

Validation Rules
User must be authenticated.
User must have a seller profile.
Seller profile must belong to the authenticated user.
Business Rules
A seller can access only their own seller profile.
Seller profile information must not expose sensitive administrative information unnecessarily.
Verification status may be returned to the seller.
Seller cannot modify administrative verification decisions through this endpoint.
Success Response
Status
200 OK

Example:

{
  "success": true,
  "data": {
    "seller": {
      "id": "seller-id",
      "userId": "user-id",
      "businessName": "ABC Electronics",
      "status": "Pending"
    }
  },
  "message": "Seller profile retrieved successfully"
}
Error Responses
401 Unauthorized
Authentication required.
404 Not Found
Seller profile not found.
Side Effects

None.

Related Entities
User
Seller Profile
Role
Idempotency

Not applicable.

7. Update Own Seller Profile
Endpoint
PATCH /api/v1/sellers/me
Purpose

Updates editable seller profile information.

Actor
Seller
Authentication

Required.

Authorization

Only the authenticated seller may update their own seller profile.

Request Body

Example:

{
  "businessName": "ABC Electronics Pvt Ltd",
  "businessDescription": "Consumer electronics and accessories"
}
Validation Rules
Seller must be authenticated.
Seller profile must exist.
Seller can update only fields permitted by seller-management rules.
Required fields must remain valid after the update.
Administrative fields must not be directly modified by the seller.
Verification-sensitive information must follow the configured re-verification rules.
Business Rules
Sellers may update permitted profile information.
Sellers cannot change their verification status.
Sellers cannot approve themselves.
Sellers cannot modify administrative decisions.
Changes to sensitive verification information may require re-verification.
A seller cannot update another seller's profile.
Success Response
Status
200 OK

Example:

{
  "success": true,
  "data": {
    "seller": {
      "id": "seller-id",
      "businessName": "ABC Electronics Pvt Ltd",
      "status": "Pending"
    }
  },
  "message": "Seller profile updated successfully"
}
Error Responses
401 Unauthorized
Authentication required.
403 Forbidden
Seller is not allowed to modify this information.
404 Not Found
Seller profile not found.
422 Unprocessable Entity
Seller profile validation failed.
Side Effects
Seller Profile may be updated.
Re-verification may be triggered where required.
Activity Log may be created.
Related Entities
Seller Profile
User
Activity Log
Audit Log
Idempotency

PATCH operations should be safely repeatable when the same resulting values are submitted.

8. Get Seller Addresses
Endpoint
GET /api/v1/sellers/me/addresses
Purpose

Returns addresses belonging to the authenticated seller.

Actor
Seller
Authentication

Required.

Authorization

Only the authenticated seller may access their own seller addresses.

Validation Rules
Seller must be authenticated.
Seller profile must exist.
Returned addresses must belong to the authenticated seller.
Business Rules
A seller may have multiple addresses.
Only seller-owned addresses may be returned.
Address information may be required for seller verification and marketplace operations.
Sensitive verification-related address changes may require re-verification.
Success Response
Status
200 OK

Example:

{
  "success": true,
  "data": {
    "addresses": []
  },
  "message": "Seller addresses retrieved successfully"
}
Related Entities
Seller Profile
Seller Address
9. Add Seller Address
Endpoint
POST /api/v1/sellers/me/addresses
Purpose

Creates an address belonging to the authenticated seller.

Actor
Seller
Authentication

Required.

Authorization

Only the authenticated seller may create their own seller address.

Request Body

Example:

{
  "addressType": "Business Address",
  "addressLine1": "123 Main Street",
  "addressLine2": "Industrial Area",
  "city": "Ghaziabad",
  "state": "Uttar Pradesh",
  "postalCode": "201009",
  "country": "India",
  "isPrimary": true
}
Validation Rules
Seller must be authenticated.
Address Line 1 is mandatory.
City is mandatory.
State is mandatory.
Postal Code is mandatory.
Country is mandatory.
Address Type must be supported.
Postal Code must follow the configured country format.
Address must belong to the authenticated seller.
Business Rules
A seller may have multiple addresses.
Supported address types may include:
Business Address
Pickup Address
Registered Address
A seller must have at least one valid address required for marketplace operations.
Only seller-owned addresses may be modified.
Primary-address rules must remain consistent with the Seller Address entity.
Success Response
Status
201 Created

Example:

{
  "success": true,
  "data": {
    "address": {
      "id": "address-id",
      "sellerId": "seller-id",
      "addressType": "Business Address",
      "city": "Ghaziabad",
      "state": "Uttar Pradesh",
      "postalCode": "201009",
      "country": "India",
      "isPrimary": true
    }
  },
  "message": "Seller address created successfully"
}
Error Responses
422 Unprocessable Entity
Invalid seller address.
404 Not Found
Seller profile not found.
Side Effects
Seller Address is created.
Primary-address state may be updated.
Activity may be recorded.
Related Entities
Seller Profile
Seller Address
Activity Log
Idempotency

Not required unless the final API architecture introduces an idempotency key for address creation.

10. Get Seller Address
Endpoint
GET /api/v1/sellers/me/addresses/:addressId
Purpose

Returns one seller address.

Actor
Seller
Authentication

Required.

Authorization

The requested address must belong to the authenticated seller.

Validation Rules
Address ID must be valid.
Address must exist.
Address must belong to the authenticated seller.
Business Rules
A seller cannot access another seller's address.
Address ownership must always be checked server-side.
Success Response
Status
200 OK
Error Responses
404 Not Found
Seller address not found.
403 Forbidden
Seller is not authorized to access this address.
Side Effects

None.

Related Entities
Seller Profile
Seller Address
Idempotency

Not applicable.

11. Update Seller Address
Endpoint
PATCH /api/v1/sellers/me/addresses/:addressId
Purpose

Updates an address belonging to the authenticated seller.

Actor
Seller
Authentication

Required.

Authorization

Only the owner of the address may modify it.

Validation Rules
Address must exist.
Address must belong to the authenticated seller.
Updated fields must satisfy address validation rules.
Required address information must remain valid.
Address type must be supported.
Business Rules
Sellers may update their own addresses.
Sellers cannot update another seller's address.
Changes to sensitive verification information may require re-verification.
Primary address rules must remain valid after the update.
Success Response
Status
200 OK
Error Responses
403 Forbidden
Seller is not authorized to modify this address.
404 Not Found
Seller address not found.
422 Unprocessable Entity
Invalid seller address.
Side Effects
Seller Address may be updated.
Re-verification may be triggered where required.
Activity Log may be created.
Related Entities
Seller Address
Seller Profile
Activity Log
Audit Log
Idempotency

PATCH is safely repeatable when the same resulting values are submitted.

12. Delete Seller Address
Endpoint
DELETE /api/v1/sellers/me/addresses/:addressId
Purpose

Removes or deactivates a seller address according to the marketplace address-retention policy.

Actor
Seller
Authentication

Required.

Authorization

Only the owner of the address may perform the operation.

Validation Rules
Address must exist.
Address must belong to the authenticated seller.
Seller must retain any address required by marketplace operations.
A primary/required address must not be removed if doing so violates seller requirements.
Business Rules
A seller must have at least one valid address required for marketplace operations.
Historical business records must not lose required address information.
If address data is referenced by historical records, physical deletion may not be appropriate.
The final implementation may use deactivation instead of physical deletion where historical preservation is required.
Success Response
Status
200 OK

Example:

{
  "success": true,
  "data": null,
  "message": "Seller address removed successfully"
}
Error Responses
400 Bad Request
Required seller address cannot be removed.
404 Not Found
Seller address not found.
Side Effects
Address may be deactivated or removed according to retention policy.
Activity may be recorded.
Related Entities
Seller Address
Seller Profile
Activity Log
Idempotency

The operation should be safely repeatable for an already inactive address.

13. Get Seller Documents
Endpoint
GET /api/v1/sellers/me/documents
Purpose

Returns verification documents submitted by the authenticated seller.

Actor
Seller
Authentication

Required.

Authorization

Only the authenticated seller may access their own submitted documents.

Validation Rules
Seller must be authenticated.
Seller profile must exist.
Documents returned must belong to the authenticated seller.
Business Rules
Sellers may view their own submitted verification documents.
Sellers must not access another seller's documents.
Sensitive document information must be protected.
Document verification status must be visible where appropriate.
Success Response
Status
200 OK

Example:

{
  "success": true,
  "data": {
    "documents": []
  },
  "message": "Seller documents retrieved successfully"
}
Side Effects

None.

Related Entities
Seller Profile
Seller Document
14. Submit Seller Document
Endpoint
POST /api/v1/sellers/me/documents
Purpose

Submits a verification document required for seller onboarding or verification.

Actor
Seller
Authentication

Required.

Authorization

Only the authenticated seller may submit documents for their own seller profile.

Request

The exact request format depends on the final document-storage architecture.

The API must support the required document metadata and secure document reference.

Example:

{
  "documentType": "Business Registration",
  "documentReference": "secure-document-reference"
}
Validation Rules
Seller must be authenticated.
Seller profile must exist.
Document type must be supported.
Required document information must be present.
Document must satisfy configured file/type/size requirements.
Document must be associated with the authenticated seller.
Unsupported or malicious files must be rejected.
Business Rules
Seller documents are used for verification.
Sellers can submit only documents belonging to themselves.
Super Admin may review submitted documents.
Invalid or rejected documents may require resubmission.
Document information must be protected because it may contain sensitive seller information.
Document submission may affect the seller verification workflow.
Success Response
Status
201 Created

Example:

{
  "success": true,
  "data": {
    "document": {
      "id": "document-id",
      "documentType": "Business Registration",
      "status": "Pending"
    }
  },
  "message": "Seller document submitted successfully"
}
Error Responses
400 Bad Request
Invalid document submission.
413 Content Too Large
Document exceeds the allowed size.
422 Unprocessable Entity
Unsupported or invalid document.
Side Effects
Seller Document is created.
Verification workflow may be updated.
Activity Log may be created.
Related Entities
Seller Profile
Seller Document
Activity Log
Audit Log
Idempotency

Document submission should use an idempotency mechanism if the final implementation supports retried file uploads.

15. Get Seller Verification Status
Endpoint
GET /api/v1/sellers/me/status
Purpose

Returns the current seller verification/onboarding status.

Actor
Seller
Authentication

Required.

Authorization

Only the authenticated seller may view their own seller status.

Validation Rules
Seller must be authenticated.
Seller profile must exist.
Business Rules
Seller must be able to determine whether onboarding/verification is pending, approved, or rejected.
Rejection information may be returned where appropriate.
Seller cannot modify their own verification status.
Verification decisions belong to authorized Super Admin operations.
Success Response
Status
200 OK

Example:

{
  "success": true,
  "data": {
    "sellerId": "seller-id",
    "status": "Pending"
  },
  "message": "Seller status retrieved successfully"
}
Side Effects

None.

Related Entities
Seller Profile
Seller Document
Activity Log
16. List Sellers — Admin
Endpoint
GET /api/v1/admin/sellers
Purpose

Allows the Super Admin to view and manage seller records.

Actor
Super Admin
Authentication

Required.

Authorization

Super Admin only.

Query Parameters

Example:

?page=1&limit=20&status=Pending&sort=createdAt&order=desc

Supported filtering may include:

Status
Search
Created date
Verification state
Validation Rules
User must be authenticated.
User must have Super Admin authorization.
Pagination parameters must be valid.
Filter values must be supported.
Sorting fields must be whitelisted.
Business Rules
Super Admin can view seller information for marketplace administration.
Seller information must not be exposed to unauthorized users.
Sensitive information should be returned only when required for administration.
Seller listing must support the verification workflow.
Success Response
Status
200 OK

Example:

{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 0,
      "totalPages": 0
    }
  },
  "message": "Sellers retrieved successfully"
}
Error Responses
401 Unauthorized
Authentication required.
403 Forbidden
Super Admin authorization required.
Related Entities
Seller Profile
User
Role
Seller Document
Seller Address
17. Get Seller Details — Admin
Endpoint
GET /api/v1/admin/sellers/:sellerId
Purpose

Returns detailed seller information for administrative review.

Actor
Super Admin
Authentication

Required.

Authorization

Super Admin only.

Validation Rules
Seller ID must be valid.
Seller must exist.
Requesting user must have Super Admin authorization.
Business Rules

The Super Admin may view seller information required for:

Seller verification
Seller management
Seller status review
Seller category management
Success Response
Status
200 OK

Example:

{
  "success": true,
  "data": {
    "seller": {
      "id": "seller-id",
      "profile": {},
      "addresses": [],
      "documents": [],
      "categories": [],
      "status": "Pending"
    }
  },
  "message": "Seller details retrieved successfully"
}
Error Responses
403 Forbidden
Super Admin authorization required.
404 Not Found
Seller not found.
Side Effects

None.

Related Entities
Seller Profile
Seller Address
Seller Document
Seller Category
Category
User
Role
18. Update Seller Status — Admin
Endpoint
PATCH /api/v1/admin/sellers/:sellerId/status
Purpose

Changes the seller's administrative/verification status.

Actor
Super Admin
Authentication

Required.

Authorization

Super Admin only.

Request Body

Example:

{
  "status": "Approved"
}
Validation Rules
Seller must exist.
Status must be a supported seller status.
Requesting user must be Super Admin.
Invalid status transitions must be rejected.
Status changes must be recorded for audit purposes.
Business Rules
Seller verification is controlled by the Super Admin.
Seller cannot modify their own verification status.
Only authorized administrative operations may change seller status.
Approval must not occur unless required seller verification information has been completed.
Rejected sellers may be required to correct information and resubmit.
Status changes must be auditable.
Seller access to restricted marketplace operations depends on the resulting status.
Success Response
Status
200 OK

Example:

{
  "success": true,
  "data": {
    "sellerId": "seller-id",
    "status": "Approved"
  },
  "message": "Seller status updated successfully"
}
Error Responses
403 Forbidden
Super Admin authorization required.
404 Not Found
Seller not found.
422 Unprocessable Entity
Invalid seller status transition.
Side Effects
Seller status is updated.
Seller permissions may change as a result.
Audit Log must record the administrative status change.
Activity Log may also be created.
Related Entities
Seller Profile
User
Role
Audit Log
Activity Log
Idempotency

Setting a seller to a status it already has should not create an additional business effect.

19. Approve Seller — Admin
Endpoint
POST /api/v1/admin/sellers/:sellerId/approve
Purpose

Approves a seller after successful verification.

Actor
Super Admin
Authentication

Required.

Authorization

Super Admin only.

Request Body

No body is required unless approval metadata is introduced later.

Validation Rules
Seller must exist.
Seller must satisfy required verification requirements.
Required documents must be available and valid.
Required seller information must be complete.
Requesting user must be Super Admin.
Seller must be in an approvable status.
Business Rules
Only the Super Admin can approve a seller.
Approval must occur only after required verification is complete.
Approved sellers may access marketplace operations permitted to approved sellers.
Approval must be auditable.
Seller cannot approve themselves.
Existing seller data must not be silently changed as part of approval.
Success Response
Status
200 OK

Example:

{
  "success": true,
  "data": {
    "sellerId": "seller-id",
    "status": "Approved"
  },
  "message": "Seller approved successfully"
}
Error Responses
403 Forbidden
Super Admin authorization required.
404 Not Found
Seller not found.
422 Unprocessable Entity
Seller is not eligible for approval.
Side Effects
Seller status becomes Approved.
Seller's access to approved seller operations becomes available.
Audit Log is created.
Activity Log may be created.
Related Entities
Seller Profile
Seller Document
Seller Address
Audit Log
Activity Log
Idempotency

Approving an already approved seller should not produce another approval business effect.

20. Reject Seller — Admin
Endpoint
POST /api/v1/admin/sellers/:sellerId/reject
Purpose

Rejects seller verification when the seller does not satisfy the marketplace requirements.

Actor
Super Admin
Authentication

Required.

Authorization

Super Admin only.

Request Body

Example:

{
  "reason": "Required verification document is invalid."
}
Validation Rules
Seller must exist.
Seller must be in a rejectable state.
Rejection reason must be provided where required.
Rejection reason must satisfy configured length and content validation.
Requesting user must be Super Admin.
Business Rules
Only the Super Admin can reject a seller.
Rejection must have an appropriate reason.
Rejected sellers must not perform operations restricted to approved sellers.
Sellers may correct required information and resubmit where permitted.
Rejection must be auditable.
Rejection does not delete the seller account.
Success Response
Status
200 OK

Example:

{
  "success": true,
  "data": {
    "sellerId": "seller-id",
    "status": "Rejected",
    "reason": "Required verification document is invalid."
  },
  "message": "Seller rejected successfully"
}
Error Responses
403 Forbidden
Super Admin authorization required.
404 Not Found
Seller not found.
422 Unprocessable Entity
Seller cannot be rejected in its current state.
Side Effects
Seller status becomes Rejected.
Rejection reason is stored where supported by the Seller Profile model.
Audit Log is created.
Activity Log may be created.
Related Entities
Seller Profile
Seller Document
Audit Log
Activity Log
Idempotency

Rejecting an already rejected seller with the same reason should not create a duplicate business effect.

21. Get Seller Categories
Endpoint
GET /api/v1/sellers/me/categories
Purpose

Returns categories currently approved/assigned to the authenticated seller.

Actor
Seller
Authentication

Required.

Authorization

Only the authenticated seller may access their category assignments.

Validation Rules
Seller must be authenticated.
Seller profile must exist.
Categories returned must belong to the authenticated seller.
Business Rules
Seller category access is controlled by marketplace rules.
Seller cannot assign arbitrary categories to themselves.
Only categories approved/assigned through the appropriate administrative workflow may be used by the seller.
Product creation must respect the seller's approved categories.
Success Response
Status
200 OK

Example:

{
  "success": true,
  "data": {
    "categories": []
  },
  "message": "Seller categories retrieved successfully"
}
Side Effects

None.

Related Entities
Seller Profile
Seller Category
Category
22. Get Seller Categories — Admin
Endpoint
GET /api/v1/admin/sellers/:sellerId/categories
Purpose

Allows the Super Admin to view category assignments for a seller.

Actor
Super Admin
Authentication

Required.

Authorization

Super Admin only.

Validation Rules
Seller must exist.
Requesting user must be Super Admin.
Business Rules
Super Admin can review seller category assignments.
Category assignments must remain associated with valid sellers and categories.
Success Response
Status
200 OK
Related Entities
Seller Profile
Seller Category
Category
User
Role
23. Assign Category to Seller — Admin
Endpoint
POST /api/v1/admin/sellers/:sellerId/categories
Purpose

Assigns an approved marketplace category to a seller.

Actor
Super Admin
Authentication

Required.

Authorization

Super Admin only.

Request Body

Example:

{
  "categoryId": "category-id"
}
Validation Rules
Seller must exist.
Category must exist.
Category must be valid and eligible for assignment.
Requesting user must be Super Admin.
Duplicate seller-category assignments must be prevented.
Business Rules
Seller category assignment is controlled by the Super Admin.
Seller cannot assign categories to themselves.
Seller can operate only within categories assigned/approved for them.
Category assignment may be required before a seller can create products under that category.
Category assignment changes must be auditable.
Success Response
Status
201 Created

Example:

{
  "success": true,
  "data": {
    "sellerCategory": {
      "sellerId": "seller-id",
      "categoryId": "category-id"
    }
  },
  "message": "Category assigned to seller successfully"
}
Error Responses
403 Forbidden
Super Admin authorization required.
404 Not Found
Seller or category not found.
409 Conflict
Category is already assigned to this seller.
Side Effects
Seller Category is created.
Seller's permitted category scope changes.
Audit Log may be created.
Activity Log may be created.
Related Entities
Seller Profile
Seller Category
Category
Audit Log
Activity Log
Idempotency

Repeated assignment of the same category must not create duplicate Seller Category records.

24. Remove Category from Seller — Admin
Endpoint
DELETE /api/v1/admin/sellers/:sellerId/categories/:categoryId
Purpose

Removes a category assignment from a seller.

Actor
Super Admin
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
Only the Super Admin can remove seller category assignments.
Seller cannot remove category assignments through administrative APIs.
Removing a category must not silently invalidate historical orders or financial records.
Existing products/orders must follow the marketplace's historical-data policy.
Category assignment changes must be auditable.
Success Response
Status
200 OK

Example:

{
  "success": true,
  "data": null,
  "message": "Category removed from seller successfully"
}
Error Responses
403 Forbidden
Super Admin authorization required.
404 Not Found
Seller-category assignment not found.
Side Effects
Seller Category assignment is removed/deactivated.
Seller's future category operations may be restricted.
Audit Log may be created.
Activity Log may be created.
Related Entities
Seller Profile
Seller Category
Category
Audit Log
Activity Log
Idempotency

Removing an already removed assignment should not create another business effect.

25. Seller Authorization Rules

Seller Management APIs follow these authorization rules:

Operation	Customer	Seller	Super Admin
Create own seller onboarding	Yes	No/Existing	No
View own seller profile	No/After onboarding	Yes	Yes
Update own seller profile	No/After onboarding	Yes	Yes
Manage own addresses	No/After onboarding	Yes	Yes
Submit own documents	No/After onboarding	Yes	Yes
View own verification status	No/After onboarding	Yes	Yes
View all sellers	No	No	Yes
Approve seller	No	No	Yes
Reject seller	No	No	Yes
Change seller status	No	No	Yes
Assign category	No	No	Yes
Remove category	No	No	Yes

The final authorization matrix must remain synchronized with the global RBAC rules in docs/api-design.md.

26. Seller Verification Rules

Seller verification is an administrative process.

The following rules apply:

Seller must provide required onboarding information.
Seller must provide required verification documents.
Seller must provide required address information.
Super Admin reviews seller information.
Super Admin may approve or reject the seller.
Seller cannot approve themselves.
Seller cannot modify their own verification status.
Rejected sellers may resubmit corrected information where permitted.
Approval and rejection actions must be auditable.
Only approved sellers may perform operations that require seller approval.
Sensitive seller information must be accessible only to authorized users.
27. Seller Status Rules

The exact status values must remain synchronized with the Seller Profile entity.

Possible lifecycle states include:

Pending
Approved
Rejected
Suspended
Inactive

The final status set must be taken from the database design and business requirements rather than independently redefining it at the API layer.

General rules:

Pending sellers are undergoing onboarding/verification.
Approved sellers may perform permitted marketplace operations.
Rejected sellers cannot perform restricted seller operations.
Suspended sellers cannot perform operations restricted during suspension.
Inactive sellers cannot perform operations requiring an active seller account.
Only authorized administrative operations may change seller status.
28. Seller Ownership Rules

The backend must enforce seller ownership server-side.

A seller:

Can access their own profile.
Can access their own addresses.
Can access their own documents.
Can access their own category assignments.
Cannot access another seller's private information.
Cannot modify another seller's records.
Cannot approve or reject another seller.
Cannot assign categories to themselves through administrative APIs.
Cannot modify Super Admin-controlled information.

Ownership must never be determined solely from a client-provided seller ID.

29. Seller Security Rules

Seller APIs must follow the global security requirements defined in api-design.md.

Additional seller-specific requirements include:

Seller documents must be protected.
Seller addresses must not be exposed to unauthorized users.
Administrative seller operations require Super Admin authorization.
Seller ownership must be checked server-side.
Sensitive seller changes must be auditable.
Seller status changes must be auditable.
Category assignment changes must be auditable.
Uploaded documents must be validated before storage.
Seller APIs must be protected against unauthorized object access.
Seller IDs supplied by clients must never bypass ownership checks.
30. Seller API Side Effects
Operation	Seller Profile	Address	Document	Category	Audit / Activity
Create Seller	Create	-	-	-	May create
Update Profile	Update	-	-	-	May create
Add Address	-	Create	-	-	May create
Update Address	-	Update	-	-	May create
Delete Address	-	Remove/Deactivate	-	-	May create
Submit Document	-	-	Create	-	May create
Approve Seller	Update	Read	Read	-	Must record
Reject Seller	Update	Read	Read	-	Must record
Assign Category	-	-	-	Create	Must record
Remove Category	-	-	-	Remove/Deactivate	Must record
31. Common Seller API Rules

The following rules apply to all Seller Management APIs:

All protected seller APIs require authentication.
Authorization must be checked server-side.
Seller ownership must be verified before accessing seller-owned resources.
Super Admin authorization is required for administrative seller operations.
Sellers cannot modify administrative verification decisions.
Sellers cannot access another seller's private data.
Seller documents must be protected.
Seller status changes must be auditable.
Seller category changes must be auditable.
Historical business records must not be corrupted by seller updates.
API responses must not expose passwords, authentication tokens, or unnecessary sensitive information.
Validation must occur before business operations.
Database constraints must provide a second layer of protection against invalid relationships.
API behavior must remain consistent with the database entities and marketplace business rules.
32. Error Codes

The Seller Management API may use the following application-level error codes:

Error Code	Meaning
SELLER_NOT_FOUND	Seller does not exist
SELLER_PROFILE_EXISTS	Seller profile already exists
SELLER_NOT_APPROVED	Seller is not approved
SELLER_SUSPENDED	Seller is suspended
SELLER_INACTIVE	Seller is inactive
SELLER_ACCESS_DENIED	Seller cannot access the resource
INVALID_SELLER_STATUS	Seller status is invalid
INVALID_STATUS_TRANSITION	Status transition is not allowed
SELLER_DOCUMENT_INVALID	Seller document is invalid
SELLER_DOCUMENT_NOT_FOUND	Seller document does not exist
SELLER_ADDRESS_NOT_FOUND	Seller address does not exist
SELLER_CATEGORY_NOT_FOUND	Seller-category assignment does not exist
CATEGORY_NOT_FOUND	Category does not exist
CATEGORY_ALREADY_ASSIGNED	Category is already assigned
VERIFICATION_INCOMPLETE	Seller verification is incomplete
VERIFICATION_FAILED	Seller verification requirements are not satisfied
ADMIN_AUTHORIZATION_REQUIRED	Super Admin authorization is required
VALIDATION_ERROR	Request validation failed
33. Idempotency Summary
Operation	Idempotency Behavior
Create Seller	Duplicate seller profiles must be prevented
Update Seller	Same update should produce same resulting state
Add Address	Duplicate creation may occur unless idempotency mechanism is used
Update Address	Safely repeatable
Delete Address	Safely repeatable after deactivation
Submit Document	Should support idempotency for retried submissions where required
Approve Seller	Repeated approval should not create another approval effect
Reject Seller	Repeated rejection with same state should not create another business effect
Assign Category	Duplicate assignments must be prevented
Remove Category	Repeated removal should not create another business effect
34. Completion Criteria

Seller Management API design is considered complete when:

Seller onboarding is documented.
Seller profile APIs are documented.
Seller address APIs are documented.
Seller document APIs are documented.
Seller verification APIs are documented.
Seller status management is documented.
Seller category management is documented.
Seller ownership rules are defined.
Seller RBAC rules are defined.
Validation rules are defined.
Business rules are defined.
Success responses are defined.
Error responses are defined.
Security requirements are defined.
Side effects are defined.
Idempotency behavior is defined.
Audit requirements are defined.
Seller APIs remain synchronized with the Seller-related database entities.
35. Related Documents

This document must remain synchronized with:

docs/api-design.md
docs/api/authentication.md
docs/database-design.md
docs/entities/
docs/SRS.md
docs/business-workflows.md
context/business-glossary.md

Any change to Seller Profile, Seller Address, Seller Document, Seller Category, Category, User, Role, or seller verification rules must be reviewed against this document.

36. Seller Management API Summary

The Seller Management API controls the seller lifecycle:

Authenticated User
       │
       ▼
Seller Onboarding
       │
       ▼
Seller Profile
       │
       ├── Seller Address
       │
       └── Seller Documents
               │
               ▼
        Super Admin Review
               │
        ┌──────┴──────┐
        ▼             ▼
    Approved       Rejected
        │             │
        ▼             ▼
Seller Operations   Resubmission
        │
        ▼
Seller Category Assignment
        │
        ▼
Product Management

The Seller Management API provides the controlled boundary between user authentication, seller verification, seller ownership, category authorization, and subsequent marketplace seller operations.