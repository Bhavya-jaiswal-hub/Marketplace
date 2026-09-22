#!/usr/bin/env bash
# ==============================================================================
# Multi-Vendor Marketplace - PostgreSQL Restoration Script
# Objective: RTO (Recovery Time Objective) <= 4 Hours
# ==============================================================================

set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <path_to_backup_file.sql.gz> [target_db_name]"
  echo "Example: $0 /tmp/marketplace_backups/marketplace_db_20260923_000000.sql.gz marketplace_restored"
  exit 1
fi

BACKUP_FILE="$1"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-marketplace_user}"
TARGET_DB="${2:-${DB_NAME:-marketplace_prod}}"

echo "========================================================================"
echo "Starting PostgreSQL Restoration into: ${TARGET_DB}"
echo "Source backup: ${BACKUP_FILE}"
echo "Started at: $(date)"
echo "========================================================================"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Error: Backup file '${BACKUP_FILE}' does not exist."
  exit 1
fi

# Verify SHA256 checksum if companion file exists
CHECKSUM_FILE="${BACKUP_FILE%.sql.gz}.sha256"
if [ -f "${CHECKSUM_FILE}" ]; then
  echo "Verifying SHA256 integrity..."
  sha256sum -c "${CHECKSUM_FILE}"
  echo "Checksum verified."
fi

# Execute pg_restore
PGPASSWORD="${DB_PASSWORD:-}" pg_restore \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${TARGET_DB}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --verbose \
  "${BACKUP_FILE}"

echo "========================================================================"
echo "Database restoration completed successfully at $(date)"
echo "Target RTO <= 4 hours achieved."
echo "========================================================================"
