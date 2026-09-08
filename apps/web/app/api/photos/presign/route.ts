/**
 * GET /api/photos/presign?key=bookings/abc123/pre_valet/123456.jpg&type=image/jpeg
 *
 * Returns a presigned upload URL for direct browser-to-R2 upload.
 */
import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function isR2Configured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET
  );
}

export async function GET(req: Request) {
  if (!isR2Configured()) {
    return NextResponse.json({ error: "Photo storage not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  const contentType = searchParams.get("type") ?? "image/jpeg";

  if (!key) {
    return NextResponse.json({ error: "key required" }, { status: 400 });
  }

  const accountId = process.env.R2_ACCOUNT_ID ?? "";
  const bucket = process.env.R2_BUCKET ?? "";
  const publicUrl = process.env.R2_PUBLIC_URL ?? "";

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    },
  });

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });

  return NextResponse.json({ uploadUrl, publicUrl: `${publicUrl}/${key}` });
}
