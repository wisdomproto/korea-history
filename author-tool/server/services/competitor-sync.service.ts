import * as competitor from './competitor.service.js';
import * as youtube from './youtube-analytics.service.js';

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── YouTube ───

async function syncYouTubeChannel(
  ch: competitor.CompetitorChannel
): Promise<competitor.CompetitorContent[]> {
  if (!youtube.isConfigured()) return [];
  let channelId = ch.identifier;
  if (!channelId) {
    // Try to extract from URL: youtube.com/@handle or /channel/UC...
    const m = ch.url.match(/youtube\.com\/(?:channel\/|@)([^/?#]+)/i);
    if (m) {
      const token = m[1];
      if (token.startsWith('UC')) channelId = token;
      else channelId = (await youtube.getChannelByHandle(token)) ?? undefined;
    }
  }
  if (!channelId) return [];

  const videos = await youtube.listRecentVideos(channelId, 12);
  return videos.map((v) => ({
    id: makeId('cnt'),
    channelId: ch.id,
    channelType: 'youtube' as const,
    externalId: v.videoId,
    url: `https://www.youtube.com/watch?v=${v.videoId}`,
    title: v.title,
    publishedAt: v.publishedAt,
    thumbnailUrl: v.thumbnailUrl,
    views: v.viewCount,
    likes: v.likeCount,
    comments: v.commentCount,
  }));
}

// ─── HTML / RSS ───

function sanitize(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

interface SimpleItem {
  title: string;
  url?: string;
  publishedAt?: string;
}

function parseRssText(xml: string): SimpleItem[] {
  // Tolerant regex-based RSS/Atom item extractor (avoids xml libs).
  const out: SimpleItem[] = [];

  // RSS 2.0 <item>
  const itemRe = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml))) {
    const block = m[1];
    const title = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '';
    const link = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ?? '';
    const pub = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] ?? '';
    const cleanTitle = sanitize(decodeHtml(title.replace(/<!\[CDATA\[|\]\]>/g, '')));
    if (cleanTitle) {
      out.push({
        title: cleanTitle,
        url: sanitize(link),
        publishedAt: pub ? new Date(pub).toISOString() : undefined,
      });
    }
  }
  if (out.length > 0) return out;

  // Atom <entry>
  const entryRe = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
  while ((m = entryRe.exec(xml))) {
    const block = m[1];
    const title = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '';
    const link = block.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? '';
    const pub = block.match(/<published[^>]*>([\s\S]*?)<\/published>/i)?.[1]
      ?? block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i)?.[1]
      ?? '';
    const cleanTitle = sanitize(decodeHtml(title.replace(/<!\[CDATA\[|\]\]>/g, '')));
    if (cleanTitle) {
      out.push({
        title: cleanTitle,
        url: link || undefined,
        publishedAt: pub || undefined,
      });
    }
  }
  return out;
}

async function tryFetchRss(url: string): Promise<SimpleItem[]> {
  const candidates = [url];
  // Common RSS endpoints
  if (!/\.(rss|xml)$/i.test(url) && !url.includes('/feed')) {
    candidates.push(url.replace(/\/$/, '') + '/rss');
    candidates.push(url.replace(/\/$/, '') + '/feed');
    candidates.push(url.replace(/\/$/, '') + '/feed.xml');
  }
  for (const c of candidates) {
    try {
      const res = await fetch(c, { headers: { 'User-Agent': 'gcnote-bot/1.0' } });
      if (!res.ok) continue;
      const text = await res.text();
      if (text.includes('<rss') || text.includes('<feed') || text.includes('<item') || text.includes('<entry')) {
        const items = parseRssText(text);
        if (items.length > 0) return items.slice(0, 15);
      }
    } catch {
      // try next
    }
  }
  return [];
}

async function syncWebsite(
  ch: competitor.CompetitorChannel
): Promise<competitor.CompetitorContent[]> {
  const items = await tryFetchRss(ch.url);
  return items.map((i) => ({
    id: makeId('cnt'),
    channelId: ch.id,
    channelType: ch.type,
    url: i.url,
    title: i.title,
    publishedAt: i.publishedAt,
  }));
}

// ─── Orchestrator ───

export interface SyncReport {
  channelId: string;
  type: competitor.CompetitorChannelType;
  fetched: number;
  message?: string;
}

export async function syncCompetitor(competitorId: string): Promise<{
  reports: SyncReport[];
  contentCount: number;
}> {
  const c = await competitor.getCompetitor(competitorId);
  if (!c) throw new Error('Competitor not found');

  const reports: SyncReport[] = [];
  const allContent: competitor.CompetitorContent[] = [];

  for (const ch of c.channels) {
    try {
      let content: competitor.CompetitorContent[] = [];
      if (ch.type === 'youtube') {
        content = await syncYouTubeChannel(ch);
        if (!youtube.isConfigured()) {
          reports.push({ channelId: ch.id, type: ch.type, fetched: 0, message: 'YOUTUBE_API_KEY 미설정' });
          continue;
        }
      } else if (ch.type === 'website' || ch.type === 'blog') {
        content = await syncWebsite(ch);
        if (content.length === 0) {
          reports.push({ channelId: ch.id, type: ch.type, fetched: 0, message: 'RSS/feed를 찾지 못했습니다' });
          continue;
        }
      } else {
        // instagram / threads — public API access for competitors not feasible
        reports.push({ channelId: ch.id, type: ch.type, fetched: 0, message: '해당 플랫폼의 경쟁사 자동 수집은 미지원' });
        continue;
      }
      allContent.push(...content);
      reports.push({ channelId: ch.id, type: ch.type, fetched: content.length });
    } catch (err) {
      reports.push({
        channelId: ch.id,
        type: ch.type,
        fetched: 0,
        message: (err as Error).message,
      });
    }
  }

  // Update competitor: replace contents with fresh batch + bump lastSyncedAt
  const updatedChannels = c.channels.map((ch) => ({
    ...ch,
    lastSyncedAt: reports.find((r) => r.channelId === ch.id)?.fetched
      ? new Date().toISOString()
      : ch.lastSyncedAt,
  }));
  await competitor.updateCompetitor(competitorId, {
    contents: allContent,
    channels: updatedChannels,
    last_synced_at: new Date().toISOString(),
  });

  return { reports, contentCount: allContent.length };
}
