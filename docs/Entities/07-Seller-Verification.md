# Seller Verification Entity

## Overview

The Seller Verification entity tracks the administrative identity verification lifecycle of a registered Seller Profile.

The Super Admin inspects submitted identity and financial documents (PAN card, Aadhaar card, address proof, photograph, bank account details, and optional GSTIN) and records an approval decision, a rejection with mandatory feedback, or account suspension/blocking.

## Purpose

- Track verification lifecycle transitions for onboarding merchants.
- Record Super Admin review timestamps, reviewer identity, and audit rejection feedback.
- Enforce that sellers can list products only after verified approval.

## Owned By

Seller Management

## Used By

- Seller Profile Management
- Admin Dashboard (KYC Verification Queue)
- Audit & Compliance Logging

## Attributes

| Attribute | Type | Description |
|---|---|---|
| Verification ID | UUID | Unique identifier for the verification record |
| Seller ID | UUID | Seller profile being verified (Foreign Key to `SellerProfile`, Unique) |
| Verification Status | Enum | Status: `Pending Approval`, `Approved`, `Rejected`, `Suspended`, `Blocked` (SRS Section 8.6) |
| Reviewed By Admin ID | UUID (Nullable) | Super Admin who reviewed documents |
| Rejection Reason | Text (Nullable) | Mandatory feedback if verification is rejected |
| Submitted At | Timestamp | Timestamp when documents were submitted |
| Reviewed At | Timestamp (Nullable) | Timestamp when Super Admin processed verification |
| Created At | Timestamp | Record creation timestamp |
| Updated At | Timestamp | Last modification timestamp |

## Relationships

A Seller Verification:
- Belongs to exactly one **Seller Profile** (1 : 1).
- Has many associated **Verification Documents**.
- Is reviewed by one **User** (Super Admin).

```
Seller Profile ─── 1 : 1 ─── Seller Verification ─── 1 : Many ─── Verification Document
```