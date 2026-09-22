# Authentication API

## Document Information

| Field | Value |
|---|---|
| Document Name | Authentication API |
| Product | Multi-Vendor Marketplace |
| API Version | v1 |
| Status | Draft |
| Parent Document | API Design |
| Related Documents | Customer Management API, Seller Management API, Reporting and Audit API |

## 1. Overview

Authentication owns user registration, email activation, credentials, sessions, refresh tokens, password reset, and authenticated identity. It does not decide marketplace permissions owned by Seller, Category, Order, or other business modules.

Version 1 supports separate Customer and Seller accounts. A single account cannot hold both capabilities. The initial Super Admin is seeded securely, with support for additional administrative accounts later.

## 2. Endpoints

| Method | Endpoint | Actor | Purpose |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Public | Register a Customer or Seller account |
| POST | `/api/v1/auth/verify-email` | Public | Activate an account using an email token |
| POST | `/api/v1/auth/resend-verification` | Public | Send a new verification email |
| POST | `/api/v1/auth/login` | Public | Authenticate and create a session |
| POST | `/api/v1/auth/refresh` | Public | Rotate a refresh token and issue access credentials |
| POST | `/api/v1/auth/logout` | Authenticated user | Revoke the current session/token |
| POST | `/api/v1/auth/logout-all` | Authenticated user | Revoke all sessions |
| GET | `/api/v1/auth/me` | Authenticated user | Return the current user identity |
| POST | `/api/v1/auth/forgot-password` | Public | Request a password reset email |
| POST | `/api/v1/auth/reset-password` | Public | Set a new password with a valid reset token |
| GET | `/api/v1/auth/sessions` | Authenticated user | List the user's sessions |
| DELETE | `/api/v1/auth/sessions/:sessionId` | Authenticated user | Revoke one owned session |

## 3. Entities and Credentials

The module uses User, Role, Session, Refresh Token, and Password Reset Token. Passwords, refresh tokens, reset tokens, and email-verification tokens are stored only as secure hashes where persistence is required.

Access credentials should be short-lived. Refresh tokens are rotated on use, tied to a session, and revoked when reuse or suspicious rotation is detected. Exact token lifetimes are environment configuration and must not be hard-coded in client contracts.

## 4. Account States and Registration

```text
Pending -> Active -> Suspended
                   -> Blocked
                   -> Inactive
```

- Registration creates a Pending account and sends an email-verification message.
- The account becomes Active only after successful email verification and required account checks.
- Suspended, Blocked, and Inactive accounts cannot authenticate.
- Seller verification is a separate workflow; email activation does not approve a seller.
- Rejected seller applications may be resubmitted according to Seller Management rules.
- Account deletion is not physical deletion. Deactivation/anonymization must preserve required orders, payments, settlements, and audit history.

## 5. Register

`POST /api/v1/auth/register`

```json
{
  "email": "user@example.com",
  "password": "Strong-password-value",
  "accountType": "CUSTOMER"
}
```

`accountType` is `CUSTOMER` or `SELLER`. The request must validate email format, password policy, account type, and uniqueness according to the approved account model. The password is hashed before persistence. The response must not reveal whether an unrelated email exists when that would enable account enumeration.

## 6. Verify Email

`POST /api/v1/auth/verify-email`

```json
{
  "token": "email-verification-token"
}
```

The token must be single-use, securely stored as a hash, time-limited, and invalidated after successful use. Repeated use must not reactivate a blocked or otherwise ineligible account.

`POST /api/v1/auth/resend-verification` must rate-limit requests and return a privacy-preserving response.

## 7. Login

`POST /api/v1/auth/login`

```json
{
  "email": "user@example.com",
  "password": "Strong-password-value"
}
```

The service validates credentials, account status, and email activation before creating a Session and issuing access and refresh credentials. Failed attempts must use a generic error response, be rate-limited at five failed attempts per 15 minutes per account/IP policy, and be recorded for security monitoring.

Successful responses contain only safe user identity, role, access-token, refresh-token delivery, expiry, and session information. They never contain password hashes or token hashes.

## 8. Refresh and Logout

`POST /api/v1/auth/refresh` accepts a refresh token and rotates it atomically with the associated Session. A reused, revoked, expired, or mismatched token is rejected and may revoke the token family/session according to security policy.

`POST /api/v1/auth/logout` revokes the current session or refresh-token family. `POST /api/v1/auth/logout-all` revokes every session owned by the authenticated user. Logout is idempotent and must not affect business records.

## 9. Current User and Sessions

`GET /api/v1/auth/me` derives identity from the authenticated access credential and returns the current User and assigned Role without sensitive fields. Session listing exposes safe metadata such as creation time, last-used time, expiry, device label, and current-session indicator.

A user may revoke only their own sessions. Administrative session intervention requires an explicit Super Admin contract and audit record.

## 10. Password Reset

`POST /api/v1/auth/forgot-password`

```json
{
  "email": "user@example.com"
}
```

The response must not reveal whether the email is registered. Requests are limited to three per hour per account/IP policy. A valid request creates a single-use, expiring Password Reset Token and queues an email.

`POST /api/v1/auth/reset-password`

```json
{
  "token": "password-reset-token",
  "newPassword": "New-strong-password-value"
}
```

The reset token, expiry, usage state, password policy, and account state must be validated before replacing the password hash. Successful reset invalidates the token and revokes existing sessions/refresh tokens according to security policy.

## 11. Authorization Boundary

Authentication proves identity. Authorization middleware and the owning business module enforce roles, seller approval, resource ownership, account status, and operation-specific permissions. No endpoint may trust a role or user identifier supplied in the request body.

## 12. Standard Responses

Successful responses use the project-wide response envelope defined by API Design. Authentication errors use generic messages where necessary to avoid account enumeration. Validation errors identify safe fields without returning secrets.

## 13. Errors

`VALIDATION_ERROR`, `INVALID_CREDENTIALS`, `ACCOUNT_NOT_FOUND`, `ACCOUNT_NOT_ACTIVE`, `EMAIL_NOT_VERIFIED`, `EMAIL_ALREADY_VERIFIED`, `EMAIL_VERIFICATION_INVALID`, `EMAIL_VERIFICATION_EXPIRED`, `TOKEN_INVALID`, `TOKEN_EXPIRED`, `TOKEN_REVOKED`, `SESSION_NOT_FOUND`, `SESSION_ACCESS_DENIED`, `PASSWORD_RESET_INVALID`, `PASSWORD_RESET_EXPIRED`, `PASSWORD_RESET_USED`, `PASSWORD_POLICY_FAILED`, `RATE_LIMIT_EXCEEDED`, and `ACCOUNT_LOCKED`.

## 14. Idempotency, Audit, and Security

- Registration, email verification, resend requests, logout, logout-all, password-reset requests, and password reset must have safe retry behavior.
- Login failures, successful logins, verification, refresh rotation, token reuse, logout, password changes, and administrative account-state changes must be audited or security-logged according to policy.
- Rate limits start at: login five failed attempts per 15 minutes per account/IP; password reset three requests per hour per account/IP.
- Passwords and tokens must never be logged, returned after hashing, or included in audit records.
- Email and reset links must use trusted server configuration and must not permit open redirects.
- Sensitive authentication endpoints require HTTPS in deployed environments.

## 15. Test Scenarios

- Register Customer and Seller accounts with valid data.
- Duplicate account registration is rejected without unsafe account enumeration.
- Unverified users cannot log in.
- Valid email verification activates a Pending account once.
- Expired, invalid, and reused verification tokens are rejected.
- Valid login creates a session and credentials.
- Suspended, Blocked, and Inactive accounts cannot log in.
- Refresh rotates the token and rejects reuse of the previous token.
- Logout revokes the current session; logout-all revokes all owned sessions.
- A user cannot revoke another user's session.
- Forgot-password responses do not reveal account existence.
- Expired or reused reset tokens are rejected.
- Successful password reset invalidates the reset token and active sessions as configured.
- Login and password-reset rate limits are enforced.
- Secrets, password hashes, and token hashes are absent from responses and logs.

## 16. Related Entities

User, Role, Session, Refresh Token, Password Reset Token, Customer Profile, Seller Profile, Notification, Audit Log, Activity Log.
