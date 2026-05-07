import { BetaAnalyticsDataClient } from '@google-analytics/data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const propertyId = process.env.GA4_PROPERTY_ID!;
export const property = `properties/${propertyId}`;

let credentials: Record<string, string>;
const keyValue = process.env.GA4_SERVICE_ACCOUNT_KEY;

if (process.env.GA4_CLIENT_EMAIL && process.env.GA4_PRIVATE_KEY) {
  credentials = {
    client_email: process.env.GA4_CLIENT_EMAIL,
    private_key: process.env.GA4_PRIVATE_KEY.replace(/\\n/g, '\n'),
  };
} else if (keyValue && keyValue.startsWith('{')) {
  credentials = JSON.parse(keyValue);
} else if (keyValue && keyValue.endsWith('.json')) {
  const keyPath = path.isAbsolute(keyValue) ? keyValue : path.resolve(__dirname, '../', keyValue);
  credentials = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
} else if (keyValue) {
  credentials = JSON.parse(Buffer.from(keyValue, 'base64').toString('utf-8'));
} else {
  throw new Error('GA4 credentials not configured');
}

export const client = new BetaAnalyticsDataClient({ credentials });
