import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

export const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export const R2_BUCKET = process.env.R2_BUCKET_NAME!

export async function getR2DownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: R2_BUCKET, Key: key })
  return getSignedUrl(r2Client, command, { expiresIn: 3600 })
}
