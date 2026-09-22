#!/usr/bin/env bash
# ==============================================================================
# Multi-Vendor Marketplace - Automated PostgreSQL Backup Script
# Objective: RPO (Recovery Point Objective) <= 1 Hour
# ==============================================================================

set -euo pipefail

# Configurations
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="${BACKUP_DIR:-/tmp/marketplace_backups}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-marketplace_prod}"
DB_USER="${DB_USER:-marketplace_user}"
S3_BUCKET="${BACKUP_S3_BUCKET:-marketplace-prod-db-backups-ap-south-1}"
RETENTION_DAYS=30

mkdir -p "${BACKUP_DIR}"

BACKUP_FILE="${BACKUP_DIR}/marketplace_db_${TIMESTAMP}.sql.gz"
CHECKSUM_FILE="${BACKUP_DIR}/marketplace_db_${TIMESTAMP}.sha256"

echo "========================================================================"
echo "Starting PostgreSQL backup: ${DB_NAME} at $(date)"
echo "Target file: ${BACKUP_FILE}"
echo "========================================================================"

# Perform pg_dump with gzip compression
PGPASSWORD="${DB_PASSWORD:-}" pg_dump \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --compress=9 \
  --file="${BACKUP_FILE}"

# Compute SHA256 checksum for integrity verification
sha256sum "${BACKUP_FILE}" > "${CHECKSUM_FILE}"
echo "Backup completed successfully. Checksum:"
cat "${CHECKSUM_FILE}"

# Optional upload to encrypted Amazon S3 bucket if AWS CLI is configured
if command -v aws &> /dev/null && [ -n "${S3_BUCKET}" ]; then
  echo "Uploading backup to Amazon S3: s3://${S3_BUCKET}/daily/${TIMESTAMP}/"
  aws s3 cp "${BACKUP_FILE}" "s3://${S3_BUCKET}/backups/${TIMESTAMP}/marketplace_db.sql.gz" --sse AES256
  aws s3 cp "${CHECKSUM_FILE}" "s3://${S3_BUCKET}/backups/${TIMESTAMP}/marketplace_db.sha256" --sse AES256
  echo "Upload to S3 completed."
fi

# Cleanup local backups older than RETENTION_DAYS
find "${BACKUP_DIR}" -type f -name "marketplace_db_*.sql.gz" -mtime +${RETENTION_DAYS} -delete || true
find "${BACKUP_DIR}" -type f -name "marketplace_db_*.sha256" -mtime +${RETENTION_DAYS} -delete || true

echo "Backup job completed cleanly."
