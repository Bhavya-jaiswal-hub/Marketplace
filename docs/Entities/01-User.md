 Entity Details

##  User Entity

### Overview

The User entity represents every authenticated person in the Multi-Vendor Marketplace.

Every Customer, Seller, and Super Admin is first created as a User.

The User entity stores only common identity information.

Business-specific information (Seller Profile, Customer Profile, etc.) is stored in their respective entities.

---

### Purpose

- Represent authenticated users.
- Provide a common identity across the system.
- Support role-based access control.
- Act as the root entity for Customer, Seller, and Super Admin.

---

### Owned By

Identity & Access Management

---

### Used By

- Authentication
- Authorization
- Customer Management
- Seller Management
- Order Management
- Payment Management
- Notification Management
- Audit Logging

---

### Attributes

| Attribute | Description |
|-----------|-------------|
| User ID | Unique identifier for the user |
| Full Name | User's full name |
| Email | Unique email address |
| Mobile Number | Primary contact number |
| Password Hash | Encrypted password |
| Role | Customer, Seller, or Super Admin |
| Account Status | Current account status |
| Email Verified | Indicates whether the email is verified |
| Mobile Verified | Indicates whether the mobile number is verified |
| Last Login | Timestamp of the last successful login |
| Created At | Record creation timestamp |
| Updated At | Last modification timestamp |

---

### Validation Rules

- Email must be unique.
- Mobile number must be unique.
- Password shall never be stored in plain text.
- Full name is mandatory.
- Every user must have exactly one role.
- Every user must have a valid account status.

---

### Business Rules

- A Customer is created immediately after registration.
- A Seller remains inactive until verification is approved.
- The Super Admin account is created by the system.
- Users cannot change their role after account creation.
- A blocked user cannot log in.
- A suspended seller cannot access seller operations.

---

### Account Status Lifecycle

Possible account statuses:

- Pending
- Active
- Rejected
- Suspended
- Blocked

Status transitions shall follow business rules enforced by the Seller Verification and Administration modules.

---

### Relationships

A User may have:

- One Seller Profile
- One Customer Profile
- Many Sessions
- Many Refresh Tokens
- Many Notifications
- Many Audit Logs
- Many Orders (Customer)
- Many Products (Seller or Super Admin)

---

### Security Considerations

- Passwords shall be securely hashed.
- Sensitive fields shall never be exposed through public APIs.
- Authentication events shall be logged.
- Failed login attempts shall be monitored.
- Account status shall be verified before granting access.

---

### Future Enhancements

The User entity should support future capabilities including:

- Multi-Factor Authentication (MFA)
- Social Login
- Account Recovery
- Multiple Email Addresses
- Multiple Mobile Numbers
- User Preferences
- Profile Images

---

### Notes

The User entity serves as the root identity for the entire marketplace.

Business-specific information must remain outside the User entity to maintain clear separation of concerns. 

