import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const endpoint = process.env.SUPABASE_STORAGE_ENDPOINT;
const region = process.env.SUPABASE_STORAGE_REGION;
const accessKeyId = process.env.SUPABASE_STORAGE_ACCESS_KEY_ID;
const secretAccessKey = process.env.SUPABASE_STORAGE_SECRET_ACCESS_KEY;
const logoBucket = process.env.SUPABASE_LOGO_BUCKET;

if (!endpoint || !region || !accessKeyId || !secretAccessKey || !logoBucket) {
  throw new Error("Supabase storage environment variables are not configured.");
}

const s3Client = new S3Client({
  region,
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  forcePathStyle: true,
});

export const uploadLogo = async (file: File, key: string) => {
  const arrayBuffer = await file.arrayBuffer();
  const command = new PutObjectCommand({
    Bucket: logoBucket,
    Key: key,
    Body: Buffer.from(arrayBuffer),
    ContentType: file.type,
    ACL: "public-read",
  });

  await s3Client.send(command);

  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${logoBucket}/${encodeURIComponent(
    key,
  )}`;
};

export const deleteLogo = async (key: string) => {
  const command = new DeleteObjectCommand({
    Bucket: logoBucket,
    Key: key,
  });

  await s3Client.send(command);
};
