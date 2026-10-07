# ADR-004: File Storage Strategy for Sensitive Documents & Media Assets

## Status
**Proposed / Pending Client Decision**

## Context
The Multi-Vendor Clothing Marketplace requires file storage for two distinct classes of media assets:
1. **Public Assets:** Product variant catalog images, category banners, brand logos.
2. **Private & Sensitive Assets:** Seller KYC documents (Aadhaar cards, PAN cards, bank account passbooks, address proofs) and dispute/return evidence (delivery receipts, signed proof-of-delivery slips, damaged garment photos).

Sensitive documents contain personally identifiable information (PII) and financial records that must never be publicly accessible or exposed via predictable URL endpoints.

### Baseline Security & File Constraints:
- **Allowed MIME Types:** `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
- **Max File Size:** $\le 5\text{ MB}$ for KYC and dispute documents; $\le 10\text{ MB}$ for high-resolution product images.
- **Database Model:** Database stores canonical object keys/paths (e.g., `kyc/seller-123/aadhaar_front.pdf`), never raw binary blobs or permanent public URLs.

---

## Storage Architecture Options & Trade-Offs

### Option 1: Direct-to-Cloud Object Storage with Presigned Upload & Signed Read URLs (AWS S3 / GCP GCS)
The client requests a short-lived presigned upload URL from the backend API, uploads the file directly to a private cloud bucket, and the backend records the object key upon confirmation. To view documents, the backend generates time-limited (e.g., 15-minute expiry) signed read URLs strictly for authenticated Super Admins or owning sellers.

- **Pros:**
  - Zero bandwidth/memory load on backend application servers during heavy file uploads/downloads.
  - Native enterprise encryption-at-rest (AES-256) and strict IAM private bucket policies.
  - Granular time-based expiry on access links.
- **Cons:**
  - Requires active cloud credentials (AWS IAM / GCP Service Account) and client-side multi-step upload handling.
  - Slight latency overhead to request presigned upload URLs.

---

### Option 2: Backend Proxied Upload & Storage via Local Encrypted Disk / Network-Attached Storage (NAS)
The frontend sends multipart form-data directly to backend API endpoints. The backend validates file signatures/MIME types and writes files to an isolated, non-public directory on the server disk. Files are served exclusively through an authenticated streaming controller route (`/api/v1/documents/:id/download`) that verifies RBAC permissions before piping the file buffer.

- **Pros:**
  - Simple infrastructure setup with no external cloud vendor dependencies (suitable for single-server or on-premise deployments).
  - Immediate file inspection and signature verification directly inside backend middleware.
- **Cons:**
  - Consumes server RAM, CPU, and network I/O during large concurrent uploads/downloads.
  - Complicates horizontal scaling (requires shared NFS/EFS or distributed file synchronization across multiple container instances).
  - Server disk backups and encryption must be managed manually.

---

### Option 3: Hybrid Object Storage (Cloudflare R2 / AWS S3) with Backend-Mediated Signed URL Access & CDN Edge Routing
Public product images are stored in a public bucket fronted by a CDN for global caching and image optimization. Sensitive KYC and dispute documents are stored in a strictly private, isolated bucket. Access to private files is granted exclusively via backend-generated signed URLs with 10-minute expirations.

- **Pros:**
  - Zero egress fees for public images (with Cloudflare R2) and ultra-fast edge caching.
  - Absolute physical and access segregation between public marketing media and confidential KYC/dispute records.
  - Effortless horizontal scalability.
- **Cons:**
  - Managing two separate bucket policies/configurations (public vs. private).

---

## Architectural Recommendation

**Recommendation:** **Option 3 (or Option 1)** — Direct-to-Cloud Object Storage with Backend-Generated Time-Limited Signed Read URLs.

*Rationale:* Storing object keys in the database and generating short-lived (10–15 minute) signed URLs on demand ensures that sensitive Aadhaar, PAN, and dispute proof files can never be crawled, indexed, or shared publicly. It also decouples file transfer I/O from backend application instances, ensuring high throughput during peak traffic.

---

## Client Decision Required
Please review the three options above and indicate your preferred choice (`Option 1`, `Option 2`, or `Option 3`) so implementation details can be finalized.
