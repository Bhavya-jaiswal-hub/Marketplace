# Notification Management API

## Document Information

| Field | Value |
|---|---|
| Document Name | Notification Management API |
| Product | Multi-Vendor Marketplace |
| API Version | v1 |
| Status | Draft |
| Parent Document | API Design |

## 1. Overview

Notification Management creates and delivers user notifications for important marketplace events. Notification delivery is a secondary operation and must not roll back a successful primary business transaction.

## 2. Endpoints

| Method | Endpoint | Actor | Purpose |
|---|---|---|---|
| GET | `/api/v1/notifications` | Customer/Seller/Admin | List own notifications |
| GET | `/api/v1/notifications/:notificationId` | Customer/Seller/Admin | View own notification |
| POST | `/api/v1/notifications/:notificationId/read` | Customer/Seller/Admin | Mark notification read |
| POST | `/api/v1/notifications/read-all` | Customer/Seller/Admin | Mark own notifications read |
| GET | `/api/v1/admin/notification-templates` | Super Admin | List templates |
| POST | `/api/v1/admin/notification-templates` | Super Admin | Create template |
| PATCH | `/api/v1/admin/notification-templates/:templateId` | Super Admin | Update template |
| POST | `/api/v1/admin/notifications/:notificationId/retry` | Super Admin | Retry failed delivery |

## 3. Master Notification Events (SRS FR-13, BR-13, AC-8)

The system dispatches notifications across **In-App** and **Email** channels for the following **11 master lifecycle events**:

1. **Seller Registration Decision:** Seller onboarding approval or rejection (with mandatory feedback).
2. **Category Permission Decision:** Category authorization request approval, rejection, or administrative revocation.
3. **Order Placed:** Sent to customer upon successful payment capture and split notifications sent to each affected seller for their items.
4. **Order Cancelled:** Pre-shipment cancellation notice sent to customer and seller (with refund details).
5. **Order Shipped:** Sent to customer with courier name and AWB tracking number.
6. **Order Delivered:** Manual delivery confirmation by seller sent to customer, initiating the 5-day return window.
7. **Return Lifecycle:** Return requested by customer, approved by Super Admin, customer return shipment entered, seller inspection verified/rejected, or return rejected.
8. **Refund Completed:** Customer refund processed via payment gateway (with gateway refund reference).
9. **Dispute Raised:** Customer reports "Not received" within 7 days of delivery mark; alerts Super Admin and affected seller.
10. **Dispute Resolved:** Super Admin arbitrates "Not received" dispute (upholding refund with seller debit, or rejecting dispute and unblocking settlement); sent to customer and seller.
11. **Settlement Completed:** Weekly manual settlement completed by Super Admin, sent to seller with itemized breakdown and external bank transaction reference number.

## 4. Rules

- Users may access only their own notifications.
- Templates are Super Admin-managed resources.
- Notification content must not expose passwords, tokens, payment credentials, or unnecessary verification data.
- Notification creation should be idempotent for the same business event and recipient.
- Delivery failure must be recorded and retryable.
- Email is supported through the external notification provider; SMS and push remain future integrations.
- Successful primary operations remain successful when notification delivery fails.

## 5. Delivery Lifecycle

```text
Queued -> Processing -> Delivered
					-> Failed -> Retrying -> Delivered
										   -> Failed
```

The system must support in-app and email notifications for seller/category decisions, order events, shipping and delivery, return/refund events, and settlement completion. Mandatory transactional notifications cannot be disabled. SMS and push are future scope.

Delivery attempts record channel, provider reference, attempt time, status, and failure reason. Retries use bounded backoff and do not duplicate the logical notification.

## 6. Idempotency, Audit, and Security

Notification creation is idempotent for the same event, recipient, and channel. Users access only their own notifications. Templates are Super Admin-managed and must escape untrusted values. Delivery failures are recorded and retryable without rolling back the primary transaction.

## 7. Errors

`NOTIFICATION_NOT_FOUND`, `NOTIFICATION_ACCESS_DENIED`, `TEMPLATE_NOT_FOUND`, `TEMPLATE_INVALID`, `DELIVERY_FAILED`, and `VALIDATION_ERROR`.

## 8. Test Scenarios

- Required business events create one in-app/email notification per recipient.
- Duplicate event handling does not create duplicate notifications.
- A user cannot read another user's notification.
- Provider failure is retryable and does not roll back the business transaction.
- Notification content excludes passwords, tokens, payment credentials, and private documents.

## 9. Related Entities

User, Notification, Notification Template, Order, Seller Profile, Seller Category, Refund, Settlement, Activity Log, Audit Log.
