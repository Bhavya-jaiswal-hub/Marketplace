## 5.5 Password Reset Token Entity

### Overview

The Password Reset Token entity represents a temporary credential used to securely authorize a password reset request.

The token ensures that only a person who has access to the password-reset mechanism can change the account password.

---

### Purpose

- Support secure password recovery.
- Associate password-reset requests with a user.
- Limit the validity period of reset requests.
- Allow reset requests to be invalidated after use.

---

### Owned By

Identity & Access Management

---

### Used By

- Authentication
- User Management
- Security Monitoring

---

### Attributes

| Attribute | Description |
|-----------|-------------|
| Password Reset Token ID | Unique identifier for the reset request |
| User ID | User associated with the reset request |
| Token Hash | Secure representation of the reset token |
| Token Status | Current status of the reset request |
| Expires At | Token expiration timestamp |
| Created At | Token creation timestamp |
| Used At | Timestamp when the token was successfully used |
| Revoked At | Timestamp when the token was invalidated |

---

### Validation Rules

- Every reset token must belong to a valid User.
- The token must have an expiration time.
- Expired tokens must not be accepted.
- Used tokens must not be accepted again.
- Revoked tokens must not be accepted.
- Raw reset tokens must not be stored in the database.

---

### Business Rules

- A user can request a password reset.
- The system generates a temporary reset credential.
- The reset credential is sent through the configured password-reset channel.
- The user must provide a valid, non-expired credential to reset the password.
- A reset credential becomes invalid after successful use.
- A reset credential may be revoked when a new reset request is generated.
- Successfully resetting a password should invalidate relevant existing authentication sessions when required by the security policy.

---

### Token Lifecycle

```text
Created
   ↓
Active
   ↓
Used  


A token may also become:

Active
   ↓
Expired 

or: 


Active
   ↓
Revoked 

Relationships

A Password Reset Token belongs to one User.  

User
  │
  └─── 1 : Many ─── Password Reset Token 