
 ## 5.3 Session Entity
 
### Overview

The Session entity represents an authenticated login session created when a user successfully logs into the marketplace.

It allows the system to track and manage active user sessions.

---

### Purpose

- Track authenticated user sessions.
- Associate sessions with users.
- Support session expiration.
- Allow session revocation.
- Improve account security.

---

### Owned By

Identity & Access Management

---

### Used By

- Authentication
- Authorization
- User Management
- Security Monitoring

---

### Attributes

| Attribute | Description |
|-----------|-------------|
| Session ID | Unique identifier for the session |
| User ID | User associated with the session |
| Session Status | Current status of the session |
| Created At | Session creation timestamp |
| Expires At | Session expiration timestamp |
| Last Activity At | Last recorded session activity |
| Revoked At | Timestamp when the session was revoked |
| Created From | Information about the originating client/device |
| Created At | Record creation timestamp |
| Updated At | Last modification timestamp |

---

### Validation Rules

- Every session must belong to a valid User.
- A session must have an expiration time.
- A revoked session cannot become active again.
- Expired sessions must not be used for authentication.
- Session records must have a unique identifier.

---

### Business Rules

- A successful login creates an authenticated session.
- A user may have multiple active sessions.
- A user may log out from the current session.
- The system may revoke all sessions when required for security.
- Blocked or suspended users must not be allowed to create new sessions.
- Expired or revoked sessions cannot access protected resources.

---

### Session Lifecycle

```text
Created
   ↓
Active
   ↓
Expired  