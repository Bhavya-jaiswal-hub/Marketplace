
##  Verification Document Entity

### Overview

The Verification Document entity represents a document submitted by a seller as part of the seller verification process.

Documents may include:

- Aadhaar
- PAN
- GST-related documents when applicable
- Seller photograph

Each document belongs to a specific verification submission so that previous submissions remain historically traceable.

---

### Purpose

- Store metadata about seller verification documents.
- Associate documents with a specific verification submission.
- Track document type and status.
- Support document resubmission.
- Maintain verification history.

---

### Owned By

Seller Management

---

### Used By

- Seller Verification
- Super Admin
- File Storage
- Audit & Reporting

---

### Attributes

| Attribute | Description |
|-----------|-------------|
| Document ID | Unique identifier for the document |
| Verification ID | Verification submission associated with the document |
| Document Type | Aadhaar, PAN, GST, Photograph, etc. |
| File Reference | Reference to the securely stored file |
| Document Status | Current document status |
| Uploaded At | Timestamp when the document was uploaded |
| Reviewed At | Timestamp when the document was reviewed |
| Review Remarks | Remarks provided during review |
| Created At | Record creation timestamp |
| Updated At | Last modification timestamp |

---

### Document Types

The system may support:

- Aadhaar
- PAN
- GST Document
- Seller Photograph

The exact mandatory documents depend on the seller type and the final verification rules defined by the business requirements.

---

### Document Status

Possible statuses include:

- Pending
- Approved
- Rejected

---

### Validation Rules

- Every document must belong to a valid verification submission.
- Document type must be valid.
- Required documents must be submitted before verification can be completed.
- Rejected documents must have appropriate review remarks when required.
- File type and file size must satisfy configured upload rules.
- A document must reference a securely stored file.
- Sensitive document files must not be publicly accessible.

---

### Business Rules

- Sellers must submit the required verification documents during onboarding.
- The Super Admin reviews submitted verification documents.
- A rejected seller may resubmit the required documents.
- Resubmitted documents must be associated with the new verification submission.
- Previous document records must remain available for verification history and auditing.
- Verification documents must not be displayed publicly to customers.
- Documents belonging to one seller must not be accessible by another seller.

---

### Document Lifecycle

```text
Uploaded
    ↓
Pending Review
    ↓
Approved  