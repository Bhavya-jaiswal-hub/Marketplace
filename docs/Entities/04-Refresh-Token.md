

## 5.4 Refresh Token Entity

### Overview

The Refresh Token entity represents a token that allows an authenticated user to obtain a new access session without entering their password again.

Refresh tokens are used to maintain a user's authenticated state securely while limiting the lifetime of short-lived access credentials.

---

### Purpose

- Maintain authenticated sessions.
- Allow access credentials to be renewed.
- Avoid requiring users to log in repeatedly.
- Support secure session revocation.

---

### Owned By

Identity & Access Management

---

### Used By

- Authentication
- Session Management
- Security Monitoring

---

### Attributes

| Attribute | Description |
|-----------|-------------|
| Refresh Token ID | Unique identifier for the token record |
| User ID | User associated with the token |
| Session ID | Session associated with the token |
| Token Hash | Secure representation of the refresh token |
| Token Status | Current token status |
| Expires At | Token expiration timestamp |
| Created At | Token creation timestamp |
| Revoked At | Timestamp when the token was revoked |
| Revocation Reason | Reason for token revocation |

---

### Validation Rules

- Every refresh token must belong to a valid User.
- Every refresh token must be associated with a valid Session.
- Token records must have a unique identifier.
- Expired tokens cannot be used.
- Revoked tokens cannot be used.
- Raw refresh tokens must not be stored in the database.

---

### Business Rules

- A refresh token is created when an authenticated session is established.
- A refresh token can only be used by its associated user/session.
- Expired refresh tokens must be rejected.
- Revoked refresh tokens must be rejected.
- Logging out may revoke the associated refresh token.
- Security-sensitive events may revoke all refresh tokens belonging to a user.

---

### Token Lifecycle

```text
Created
   ↓
Active
   ↓
Expired 