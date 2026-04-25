import { Router } from 'express';
import { config } from '../config.js';

const router = Router();

interface ServiceStatus {
  id: string;
  label: string;
  icon: string;
  connected: boolean;
  fields?: Array<{ key: string; set: boolean; preview?: string }>;
  note?: string;
}

function mask(s: string, keep = 4): string {
  if (!s) return '';
  if (s.length <= keep) return '*'.repeat(s.length);
  return s.slice(0, keep) + '*'.repeat(Math.min(s.length - keep, 12));
}

router.get('/', (_req, res) => {
  const services: ServiceStatus[] = [
    {
      id: 'gemini',
      label: 'Gemini AI',
      icon: '🤖',
      connected: !!config.gemini.apiKey,
      fields: [
        { key: 'GEMINI_API_KEY', set: !!config.gemini.apiKey, preview: mask(config.gemini.apiKey) },
      ],
      note: 'AI 콘텐츠 생성 (기본글, 블로그, 카드뉴스 등)',
    },
    {
      id: 'naver',
      label: 'Naver 검색광고',
      icon: '🟢',
      connected: !!(config.naver.licenseKey && config.naver.secretKey && config.naver.customerId),
      fields: [
        { key: 'NAVER_API_LICENSE_KEY', set: !!config.naver.licenseKey, preview: mask(config.naver.licenseKey) },
        { key: 'NAVER_API_SECRET_KEY', set: !!config.naver.secretKey, preview: mask(config.naver.secretKey) },
        { key: 'NAVER_API_CUSTOMER_ID', set: !!config.naver.customerId, preview: config.naver.customerId },
      ],
      note: '키워드 검색량 · 경쟁률 조회',
    },
    {
      id: 'ga4',
      label: 'Google Analytics 4',
      icon: '📊',
      connected: !!(
        config.ga4.propertyId &&
        (config.ga4.serviceAccountKey || (config.ga4.clientEmail && config.ga4.privateKey))
      ),
      fields: [
        { key: 'GA4_PROPERTY_ID', set: !!config.ga4.propertyId, preview: config.ga4.propertyId },
        { key: 'GA4_SERVICE_ACCOUNT_KEY', set: !!config.ga4.serviceAccountKey, preview: config.ga4.serviceAccountKey ? '(set)' : '' },
        { key: 'GA4_CLIENT_EMAIL', set: !!config.ga4.clientEmail, preview: config.ga4.clientEmail },
      ],
      note: '사이트 트래픽 분석 · 주간 리포트',
    },
    {
      id: 'gsc',
      label: 'Search Console',
      icon: '🔍',
      connected: !!config.gsc.siteUrl && !!(config.ga4.serviceAccountKey || config.ga4.clientEmail),
      fields: [
        { key: 'GSC_SITE_URL', set: !!config.gsc.siteUrl, preview: config.gsc.siteUrl },
      ],
      note: '실제 검색어 · 클릭 · 노출 · 순위',
    },
    {
      id: 'r2',
      label: 'Cloudflare R2',
      icon: '☁️',
      connected: !!(config.r2.accountId && config.r2.accessKeyId && config.r2.secretAccessKey),
      fields: [
        { key: 'R2_ACCOUNT_ID', set: !!config.r2.accountId, preview: mask(config.r2.accountId) },
        { key: 'R2_ACCESS_KEY_ID', set: !!config.r2.accessKeyId, preview: mask(config.r2.accessKeyId) },
        { key: 'R2_BUCKET_NAME', set: !!config.r2.bucketName, preview: config.r2.bucketName },
        { key: 'R2_PUBLIC_URL', set: !!config.r2.publicUrl, preview: config.r2.publicUrl },
      ],
      note: '이미지 · 컨텐츠 · 카드뉴스 저장',
    },
    {
      id: 'instagram',
      label: 'Instagram Graph',
      icon: '📸',
      connected: !!(config.instagram.userId && config.instagram.accessToken),
      fields: [
        { key: 'INSTAGRAM_USER_ID', set: !!config.instagram.userId, preview: config.instagram.userId },
        { key: 'INSTAGRAM_ACCESS_TOKEN', set: !!config.instagram.accessToken, preview: mask(config.instagram.accessToken) },
        { key: 'INSTAGRAM_GRAPH_VERSION', set: !!config.instagram.graphVersion, preview: config.instagram.graphVersion },
      ],
      note: '카드뉴스 자동 발행 (캐러셀)',
    },
    {
      id: 'supabase',
      label: 'Supabase',
      icon: '⚡',
      connected: !!(config.supabase.url && config.supabase.serviceRoleKey),
      fields: [
        { key: 'SUPABASE_URL', set: !!config.supabase.url, preview: config.supabase.url },
        { key: 'SUPABASE_SERVICE_ROLE_KEY', set: !!config.supabase.serviceRoleKey, preview: mask(config.supabase.serviceRoleKey) },
      ],
      note: '게시판 · 배너 · 주간 리포트 저장',
    },
    {
      id: 'vercel',
      label: 'Vercel Deploy Hook',
      icon: '🚀',
      connected: !!config.vercel.deployHookUrl,
      fields: [
        { key: 'VERCEL_DEPLOY_HOOK_URL', set: !!config.vercel.deployHookUrl, preview: config.vercel.deployHookUrl ? '(set)' : '' },
      ],
      note: '웹사이트 자동 재배포',
    },
  ];

  res.json({ success: true, data: { services } });
});

export default router;
