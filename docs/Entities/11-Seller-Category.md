# Seller Category Entity

## Overview

The Seller Category entity represents a category listing authorization request and permission grant for a specific Seller Profile.

Sellers must submit a request (`Requested`) to list clothing products within a category. The Super Admin reviews the request and grants (`Approved`), rejects (`Rejected`), or revokes (`Revoked`) access.

## Purpose

- Track seller permission requests to list products in specific clothing categories.
- Enforce that sellers create products exclusively within approved categories.
- Maintain category permission statuses conforming strictly to **SRS Section 8.8**.
- Support administrative category revocation (which automatically transitions live listings in that category to `Removed by Admin`).

## Owned By

Category Management

## Attributes

| Attribute | Type | Description |
|---|---|---|
| Seller Category ID | UUID | Unique identifier for the authorization record |
| Seller ID | UUID | Seller requesting access (Foreign Key to `SellerProfile`) |
| Category ID | UUID | Category requested (Foreign Key to `Category`) |
| Status | Enum | Category permission status (see Section 8.8) |
| Rejection Reason | Text (Nullable) | Feedback if request was rejected |
| Revocation Reason | Text (Nullable) | Mandatory reason if permission was revoked by Admin |
| Requested At | Timestamp | Timestamp when seller submitted request |
| Reviewed At | Timestamp (Nullable) | Timestamp when Super Admin processed the request |
| Created At | Timestamp | Record creation timestamp |
| Updated At | Timestamp | Last modification timestamp |

## Category Permission Statuses (SRS Section 8.8)

The Seller Category entity strictly conforms to the statuses defined in **SRS Section 8.8**:

- **`Requested`:** Seller submitted authorization request to list products in a clothing category; awaiting Admin review.
- **`Approved`:** Super Admin approved category authorization; seller can list products in this category.
- **`Rejected`:** Super Admin rejected category authorization request with feedback.
- **`Revoked`:** Super Admin revoked previously granted category permission; existing live listings are moved to `Removed by Admin`.

## Relationships

A Seller Category:
- Belongs to one **Seller Profile**.
- Belongs to one **Category**.
- Is unique for the `(Seller ID, Category ID)` pair.