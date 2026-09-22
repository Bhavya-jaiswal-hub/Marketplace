# Multi-Vendor Marketplace - Production Operations & Deployment Runbook

**Version:** 1.0  
**Status:** Production Ready  
**Target SLA:** 99.9% Monthly Availability (< 43.8 minutes unplanned downtime/month)  
**Recovery Targets:** RPO <= 1 Hour | RTO <= 4 Hours  

---

## 1. System Architecture & Component Overview

| Component | Technology / AWS Service | Production Configuration |
|---|---|---|
| **API Backend** | NestJS (Fastify) Node.js 20 LTS | Multi-instance container behind AWS ALB / ECS Fargate |
| **Primary Database** | PostgreSQL 16 (AWS RDS Multi-AZ) | Automated snapshots, SSL encryption, connection pooling |
| **Seller Documents** | Amazon S3 (Private Bucket) | SSE-AES256, strictly blocked public access, signed downloads |
| **Public Media** | Amazon S3 + CloudFront CDN | Product images, category icons |
| **Email Transport** | Amazon SES | DKIM/SPF verified domain, bounce & complaint monitoring |
| **Payment Gateway** | Razorpay Standard / Webhooks | HMAC-SHA256 signature verification, webhook replay protection |

---

## 2. Health Check & Monitoring Strategy

### 2.1 Health Endpoints
- **Detailed Health Probe**: `GET /api/v1/health`
  - Verifies database latency and connectivity (`SELECT 1`).
  - Reports process uptime, Node.js memory footprint (RSS, heap usage), and environment.
  - Returns HTTP `200 OK` (healthy) or `503 Service Unavailable` (degraded).
- **Liveness Probe**: `GET /api/v1/health/liveness`
  - High-frequency container orchestrator ping.
- **Readiness Probe**: `GET /api/v1/health/readiness`
  - Confirms database and resource readiness before routing ingress traffic.

### 2.2 Alerting Thresholds
- **5xx Error Rate**: Alert on > 1% over a 5-minute rolling window.
- **P95 Latency**: Alert on > 800ms over 5 minutes.
- **Database Connection Pool**: Alert when active pool exceeds 85% of capacity.
- **Low Stock Alerts**: Automated daily operational reporting on `availableQuantity <= lowStockThreshold`.

---

## 3. Disaster Recovery & Backup Runbook

### 3.1 Backup Schedule (RPO <= 1 Hour)
1. **Continuous WAL Archiving**: AWS RDS Point-in-Time Recovery enabled with 35-day retention.
2. **Automated Daily Encrypted Dumps**:
   - `scripts/backup-database.sh` runs every 6 hours / daily via cron.
   - Outputs gzip-compressed, SHA-256 verified custom dumps to encrypted S3 (`SSE-AES256`).

### 3.2 Restoration Procedure (RTO <= 4 Hours)
```bash
# 1. Download target backup from S3
aws s3 cp s3://marketplace-prod-db-backups-ap-south-1/backups/YYYYMMDD_HHMMSS/marketplace_db.sql.gz /tmp/

# 2. Run automated restoration script
./scripts/restore-database.sh /tmp/marketplace_db.sql.gz marketplace_prod

# 3. Verify Prisma migration status and schema health
npx prisma migrate status

# 4. Trigger health readiness check
curl -f https://api.marketplace.example.com/api/v1/health/readiness
```

---

## 4. Security Hardening & Compliance Checklist

### 4.1 Security Measures
- [x] **Rate Limiting**: Throttler module active (100 req/min global, 10 req/15min auth endpoints).
- [x] **Security Headers**: Fastify `onSend` hook enforcing HSTS, X-Content-Type-Options `nosniff`, X-Frame-Options `DENY`, and strict Referrer-Policy.
- [x] **Information Leakage Prevention**: Production `HttpExceptionFilter` sanitizes internal 500 error responses and suppresses stack traces.
- [x] **Private Document Isolation**: Seller KYC files stored outside webroot with HMAC verification and Super Admin authorization.
- [x] **Payment Security**: Strict HMAC-SHA256 signature validation on both frontend redirects and asynchronous webhook callbacks.

### 4.2 Regulatory & Legal Compliance
- **Tax & GST**: Category commission rates, order breakdown GST calculations, and settlement earnings are captured as immutable historical snapshots per transaction.
- **Audit Log Retention**: 7-year regulatory audit log retention semantics (`AUDIT_LOG_RETENTION_YEARS=7`) for all financial, seller verification, and administrative actions.
- **Consumer Protection**: 5-day post-delivery customer return window enforced before settlement holding clearance.

---

## 5. Deployment & Release Procedure (Zero-Downtime)

1. **Pre-Deployment**:
   - Run unit and integration test suite: `npx jest --runInBand --forceExit`
   - Build production bundle: `npm run build`
2. **Migration Execution**:
   - Run non-destructive database migrations: `npx prisma migrate deploy`
3. **Rolling Container Update**:
   - Deploy new container image to ECS / Kubernetes.
   - Wait for `readiness` probe to pass on new instances before decommissioning previous instances.
4. **Post-Deployment Verification**:
   - Verify `GET /api/v1/health` status returns `ok`.
   - Smoke test key user journeys (login, cart, checkout quote, reporting).
