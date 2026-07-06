#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# iValeter — PostgreSQL → Cloudflare R2 Backup
# Runs nightly at 2am UTC via Railway cron service.
# Keeps 30 days of backups. Older files are deleted automatically.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Validate required env vars ───────────────────────────────────────────────
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${R2_ACCESS_KEY_ID:?R2_ACCESS_KEY_ID is required}"
: "${R2_SECRET_ACCESS_KEY:?R2_SECRET_ACCESS_KEY is required}"
: "${R2_ACCOUNT_ID:?R2_ACCOUNT_ID is required}"
: "${R2_BUCKET:?R2_BUCKET is required}"

# ── Config ───────────────────────────────────────────────────────────────────
TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
FILENAME="ivaleter-backup-${TIMESTAMP}.sql.gz"
TMPFILE="/tmp/${FILENAME}"
RETENTION_DAYS=30

echo "▶ Starting backup at ${TIMESTAMP}"

# ── Dump & compress ──────────────────────────────────────────────────────────
echo "▶ Dumping database..."
pg_dump "${DATABASE_URL}" \
  --no-owner \
  --no-acl \
  --format=plain \
  --compress=9 \
  | gzip > "${TMPFILE}"

FILESIZE=$(du -sh "${TMPFILE}" | cut -f1)
echo "▶ Dump complete — ${FILESIZE} compressed"

# ── Upload to R2 via AWS CLI (S3-compatible) ──────────────────────────────────
echo "▶ Uploading to R2 bucket: ${R2_BUCKET}..."

AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
aws s3 cp "${TMPFILE}" \
  "s3://${R2_BUCKET}/${FILENAME}" \
  --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" \
  --region auto \
  --no-progress

echo "▶ Upload complete: ${FILENAME}"

# ── Clean up local temp file ─────────────────────────────────────────────────
rm -f "${TMPFILE}"

# ── Delete backups older than 30 days from R2 ────────────────────────────────
echo "▶ Pruning backups older than ${RETENTION_DAYS} days..."

CUTOFF=$(date -u -d "${RETENTION_DAYS} days ago" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || \
         date -u -v-${RETENTION_DAYS}d +"%Y-%m-%dT%H:%M:%SZ")  # macOS fallback

AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
aws s3api list-objects \
  --bucket "${R2_BUCKET}" \
  --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" \
  --region auto \
  --query "Contents[?LastModified<='${CUTOFF}'].Key" \
  --output text 2>/dev/null | tr '\t' '\n' | while read -r KEY; do
    if [ -n "${KEY}" ] && [ "${KEY}" != "None" ]; then
      echo "  Deleting old backup: ${KEY}"
      AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
      AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
      aws s3api delete-object \
        --bucket "${R2_BUCKET}" \
        --key "${KEY}" \
        --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" \
        --region auto
    fi
  done

echo "✓ Backup complete: ${FILENAME} (${FILESIZE})"

# ── List current backups ──────────────────────────────────────────────────────
echo "▶ Current backups in R2:"
AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
aws s3 ls "s3://${R2_BUCKET}/" \
  --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" \
  --region auto \
  --human-readable \
  --summarize 2>/dev/null | tail -20
