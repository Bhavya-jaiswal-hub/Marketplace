##  Seller Verification Entity

### Overview

The Seller Verification entity represents the verification process through which a seller is reviewed and approved by the Super Admin before being allowed to sell products on the marketplace.

It tracks the seller's verification status, submission history, review information, and rejection details.

---

### Purpose

- Track the seller verification process.
- Record verification status.
- Track document submission and resubmission.
- Record Super Admin review decisions.
- Store rejection reasons.
- Support seller re-submission after rejection.

---

### Owned By

Seller Management

---

### Used By

- Seller Registration
- Seller Verification
- Super Admin
- Notification Management
- Audit & Reporting

---

### Attributes

| Attribute | Description |
|-----------|-------------|
| Verification ID | Unique identifier for the verification record |
| Seller ID | Seller being verified |
| Verification Status | Current verification status |
| Submission Number | Identifies the verification submission attempt |
| Submitted At | Timestamp when verification was submitted |
| Reviewed At | Timestamp when Super Admin reviewed the submission |
| Reviewed By | Super Admin who performed the review |
| Rejection Reason | Reason provided when verification is rejected |
| Created At | Record creation timestamp |
| Updated At | Last modification timestamp |

---

### Verification Status

Possible verification statuses include:

- Pending
- Approved
- Rejected

Seller account-level statuses such as `Suspended` and `Blocked` belong to the Seller Profile rather than the verification process.

---

### Validation Rules

- Every verification record must belong to a valid Seller.
- A verification submission must contain all required documents and information.
- A rejected verification must contain a rejection reason.
- An approved verification must contain a reviewer and review timestamp.
- A verification submission cannot be reviewed by an unauthorized user.
- A completed verification record must not be modified in a way that changes its historical decision.

---

### Business Rules

- A seller must complete verification before selling products.
- The Super Admin reviews the seller verification.
- The Super Admin can approve or reject the verification.
- The Super Admin may provide rejection remarks.
- A rejected seller can submit the required information/documents again.
- Resubmission creates a new verification attempt while preserving the previous verification history.
- Approval activates the seller's ability to proceed with marketplace selling operations, subject to category approval.
- Rejection prevents the seller from selling until a subsequent verification attempt is approved.

---

### Verification Lifecycle

```text
Pending
   │
   ├──→ Approved
   │
   └──→ Rejected
             │
             └──→ New Submission
                         │
                         ▼
                       Pending   

Seller Profile
      │
      └─── 1 : Many ─── Seller Verification
                              │
                              ├── Many : 1 ─── Super Admin User
                              │
                              └── 1 : Many ─── Verification Documents 