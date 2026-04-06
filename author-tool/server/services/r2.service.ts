import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { config } from '../config.js';

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (!_client) {
    if (!config.r2.accountId) {
      throw new Error('R2_ACCOUNT_ID is not configured. Check .env file.');
    }
    _client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.r2.accessKeyId,
        secretAccessKey: config.r2.secretAccessKey,
      },
    });
  }
  return _client;
}

export async function putObject(
  key: string,
  body: Buffer | string,
  contentType?: string,
  bucket?: string,
): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket ?? config.r2.bucketName,
      Key: key,
      Body: typeof body === 'string' ? Buffer.from(body, 'utf-8') : body,
      ContentType:
        contentType ??
        (typeof body === 'string' ? 'application/json' : 'application/octet-stream'),
    }),
  );
}

export async function getObject(key: string, bucket?: string): Promise<Buffer> {
  const result = await getClient().send(
    new GetObjectCommand({
      Bucket: bucket ?? config.r2.bucketName,
      Key: key,
    }),
  );
  const stream = result.Body as NodeJS.ReadableStream;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function getObjectText(key: string, bucket?: string): Promise<string> {
  const buf = await getObject(key, bucket);
  return buf.toString('utf-8');
}

export async function deleteObject(key: string, bucket?: string): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({
      Bucket: bucket ?? config.r2.bucketName,
      Key: key,
    }),
  );
}

export async function listObjects(prefix: string, bucket?: string): Promise<string[]> {
  const result = await getClient().send(
    new ListObjectsV2Command({
      Bucket: bucket ?? config.r2.bucketName,
      Prefix: prefix,
    }),
  );
  return (result.Contents ?? []).map((obj) => obj.Key!).filter(Boolean);
}

export function getPublicUrl(key: string, bucket?: string): string {
  if (bucket && bucket === config.r2.cbtBucketName) {
    return `${config.r2.cbtPublicUrl}/${key}`;
  }
  return `${config.r2.publicUrl}/${key}`;
}

export const CBT_BUCKET = config.r2.cbtBucketName;

export async function getCbtObject(key: string): Promise<Buffer> {
  return getObject(key, CBT_BUCKET);
}

export async function getCbtObjectText(key: string): Promise<string> {
  return getObjectText(key, CBT_BUCKET);
}

export async function putCbtObject(key: string, body: Buffer | string, contentType?: string): Promise<void> {
  return putObject(key, body, contentType, CBT_BUCKET);
}
