import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

export function isR2Configured(): boolean {
  return Boolean(
    process.env.CLOUDFLARE_S3_ACCESS_KEY_ID &&
      process.env.CLOUDFLARE_S3_SECRET_ACCESS_KEY &&
      process.env.CLOUDFLARE_R2_ENDPOINT &&
      (process.env.CLOUDFLARE_R2_BUCKET || process.env.R2_BUCKET)
  );
}

export function getR2PublicBaseUrl(): string | null {
  const base =
    process.env.CLOUDFLARE_R2_PUBLIC_URL?.trim() ||
    process.env.S3_API?.trim() ||
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.trim();
  return base ? base.replace(/\/$/, "") : null;
}

function getR2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: requiredEnv("CLOUDFLARE_R2_ENDPOINT"),
    credentials: {
      accessKeyId: requiredEnv("CLOUDFLARE_S3_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnv("CLOUDFLARE_S3_SECRET_ACCESS_KEY"),
    },
    forcePathStyle: true,
  });
}

function getBucket(): string {
  return (
    process.env.CLOUDFLARE_R2_BUCKET?.trim() ||
    process.env.R2_BUCKET?.trim() ||
    requiredEnv("CLOUDFLARE_R2_BUCKET")
  );
}

export interface UploadedObject {
  key: string;
  url: string;
  contentType: string;
  size: number;
}

export async function uploadToR2(params: {
  file: Buffer;
  contentType: string;
  folder?: string;
  fileName?: string;
}): Promise<UploadedObject> {
  if (!isR2Configured()) {
    throw new Error(
      "Cloudflare R2 is not configured. Set CLOUDFLARE_R2_ENDPOINT, CLOUDFLARE_S3_ACCESS_KEY_ID, CLOUDFLARE_S3_SECRET_ACCESS_KEY, and CLOUDFLARE_R2_BUCKET."
    );
  }

  const publicBase = getR2PublicBaseUrl();
  if (!publicBase) {
    throw new Error(
      "Cloudflare R2 public URL is missing. Set CLOUDFLARE_R2_PUBLIC_URL or S3_API to your public bucket URL."
    );
  }

  const extFromName = params.fileName?.includes(".")
    ? params.fileName.split(".").pop()?.toLowerCase()
    : undefined;
  const extFromType = params.contentType.split("/")[1]?.split(";")[0];
  const ext = (extFromName || extFromType || "bin").replace(/[^a-z0-9]/gi, "");
  const folder = (params.folder || "uploads").replace(/^\/+|\/+$/g, "");
  const key = `${folder}/${randomUUID()}.${ext}`;

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: params.file,
      ContentType: params.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return {
    key,
    url: `${publicBase}/${key}`,
    contentType: params.contentType,
    size: params.file.length,
  };
}
