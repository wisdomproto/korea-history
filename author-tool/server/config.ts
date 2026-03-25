import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  dataDir: path.resolve(__dirname, '../../data/questions'),
  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? '',
    model: 'gemini-2.5-flash',
  },
  r2: {
    accountId: process.env.R2_ACCOUNT_ID ?? '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    bucketName: process.env.R2_BUCKET_NAME ?? 'korea-history-data',
    publicUrl: process.env.R2_PUBLIC_URL ?? '',
  },
  vercel: {
    deployHookUrl: process.env.VERCEL_DEPLOY_HOOK_URL ?? '',
  },
  naver: {
    licenseKey: process.env.NAVER_API_LICENSE_KEY ?? '',
    secretKey: process.env.NAVER_API_SECRET_KEY ?? '',
    customerId: process.env.NAVER_API_CUSTOMER_ID ?? '',
  },
  ga4: {
    propertyId: process.env.GA4_PROPERTY_ID ?? '',
    serviceAccountKey: process.env.GA4_SERVICE_ACCOUNT_KEY ?? '',
  },
} as const;
