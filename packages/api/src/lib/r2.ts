/**
 * Cloudflare R2 photo storage helper.
 *
 * R2 is S3-compatible. Set these env vars in Railway:
 *   R2_ACCOUNT_ID       — your Cloudflare account ID
 *   R2_ACCESS_KEY_ID    — R2 API token Access Key ID
 *   R2_SECRET_ACCESS_KEY — R2 API token Secret Access Key
 *   R2_BUCKET           — bucket name (e.g. "ivaleter-photos")
 *   R2_PUBLIC_URL       — public base URL (e.g. "https://photos.ivaleter.co.uk")
 *
 * Falls back to inline base64 storage if R2 is not configured,
 * so the system still works during transition.
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export function isR2Configured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET
  );
}

export function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID ?? "";
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    },
  });
}

/**
 * Upload a base64 photo directly to R2 and return its public URL.
 * Used server-side when the client sends base64 (current flow).
 */
export async function uploadBase64ToR2(params: {
  base64: string;        // raw base64 or data-URL
  key: string;           // e.g. "bookings/abc123/pre_valet/front.jpg"
  contentType?: string;
}): Promise<string> {
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET ?? "";
  const publicUrl = process.env.R2_PUBLIC_URL ?? "";

  // Strip data-URL prefix if present
  const raw = params.base64.replace(/^data:[^;]+;base64,/, "");
  const buffer = Buffer.from(raw, "base64");

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      Body: buffer,
      ContentType: params.contentType ?? "image/jpeg",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return `${publicUrl}/${params.key}`;
}

/**
 * Delete a photo from R2 by key.
 */
export async function deleteFromR2(key: string): Promise<void> {
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET ?? "";
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/**
 * Generate a presigned URL for direct browser-to-R2 upload.
 * Returns the upload URL and the final public URL.
 * Expires in 5 minutes.
 */
export async function getPresignedUploadUrl(params: {
  key: string;
  contentType: string;
}): Promise<{ uploadUrl: string; publicUrl: string }> {
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET ?? "";
  const publicUrl = process.env.R2_PUBLIC_URL ?? "";

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: params.key,
    ContentType: params.contentType,
    CacheControl: "public, max-age=31536000, immutable",
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });

  return {
    uploadUrl,
    publicUrl: `${publicUrl}/${params.key}`,
  };
}
