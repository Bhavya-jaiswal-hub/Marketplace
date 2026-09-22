# Customer Management API

## Document Information

| Field | Value |
|---|---|
| Document Name | Customer Management API |
| Product | Multi-Vendor Marketplace |
| API Version | v1 |
| Status | Draft |
| Parent Document | API Design |

## 1. Overview

Customer Management owns customer profiles and active delivery addresses. Customers may access only their own records. Authentication is required for all customer account operations.

## 2. Endpoints

| Method | Endpoint | Actor | Purpose |
|---|---|---|---|
| GET | `/api/v1/customers/me` | Customer | View own profile |
| PATCH | `/api/v1/customers/me` | Customer | Update own profile |
| GET | `/api/v1/customers/me/addresses` | Customer | List own addresses |
| POST | `/api/v1/customers/me/addresses` | Customer | Create an address |
| GET | `/api/v1/customers/me/addresses/:addressId` | Customer | View an address |
| PATCH | `/api/v1/customers/me/addresses/:addressId` | Customer | Update an address |
| DELETE | `/api/v1/customers/me/addresses/:addressId` | Customer | Deactivate an address |

## 3. Rules

- A customer profile belongs to one authenticated User.
- A customer can read or modify only their own profile and addresses.
- Address fields must be validated before storage.
- A customer must retain a usable address when required by checkout.
- An address used by a historical order must not be physically deleted in a way that removes historical shipping information.
- Checkout must snapshot or preserve the selected shipping address according to the finalized order model.
- Profile updates must not change orders or financial records.

## 4. Profile Operations

`GET /api/v1/customers/me` and `PATCH /api/v1/customers/me` require authentication and ownership derived from the session. Administrative fields, roles, password fields, and internal security data cannot be changed through these endpoints.

## 5. Address Operations

A request may contain address line, city, state, postal code, country, address type, and primary-address information. The exact schema must be synchronized with the finalized active Address entity.

Address creation and updates must enforce valid ownership, supported address types, postal-code rules, and primary-address consistency. Delete means deactivate when historical retention requires it.

## 6. Errors

`CUSTOMER_NOT_FOUND`, `ADDRESS_NOT_FOUND`, `ADDRESS_ACCESS_DENIED`, `INVALID_ADDRESS`, `REQUIRED_ADDRESS`, and `VALIDATION_ERROR`.

## 7. Idempotency, Audit, and Security

- Supported address types are Home, Business, and Shipping.
- Customers may keep multiple active addresses and identify a primary address.
- An address used by checkout must be active, valid, and owned by the authenticated customer.
- Orders preserve a historical shipping-address snapshot; later edits or deactivation do not change it.
- Profile and address mutations must be safe to retry, enforce ownership, and minimize personal data in logs.

## 8. Test Scenarios

- Customer can access only their own profile and addresses.
- Invalid address type or postal code is rejected.
- Primary-address rules remain consistent after create, update, and deactivate operations.
- Historical order address data remains unchanged after an address update.
- Checkout rejects an inactive or unowned shipping address.

## 9. Related Entities

User, Customer Profile, Address, Cart, Order, Activity Log, Audit Log.
