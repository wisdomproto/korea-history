export interface WpCredentials {
  siteUrl: string;      // e.g. https://yoursite.com
  username: string;
  appPassword: string;  // "XXXX XXXX XXXX XXXX XXXX XXXX"
}

export interface WpPostInput {
  title: string;
  html: string;
  status?: 'publish' | 'draft' | 'future';
  categories?: number[];
  tags?: string[];
  excerpt?: string;
  featuredMediaId?: number;
  date?: string; // ISO for scheduled (status='future')
}

export interface WpPostResult {
  id: number;
  link: string;
  status: string;
}

function authHeader(creds: WpCredentials): string {
  const pwd = creds.appPassword.replace(/\s/g, '');
  const token = Buffer.from(`${creds.username}:${pwd}`).toString('base64');
  return `Basic ${token}`;
}

function apiUrl(siteUrl: string, path: string): string {
  const base = siteUrl.replace(/\/$/, '');
  return `${base}/wp-json/wp/v2${path}`;
}

export async function testConnection(creds: WpCredentials): Promise<{ ok: boolean; message?: string; user?: string }> {
  try {
    const res = await fetch(apiUrl(creds.siteUrl, '/users/me'), {
      headers: { Authorization: authHeader(creds) },
    });
    const data = (await res.json().catch(() => ({}))) as { name?: string; code?: string; message?: string };
    if (!res.ok) return { ok: false, message: data.message ?? `HTTP ${res.status}` };
    return { ok: true, user: data.name };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

export async function createPost(creds: WpCredentials, input: WpPostInput): Promise<WpPostResult> {
  const body: Record<string, unknown> = {
    title: input.title,
    content: input.html,
    status: input.status ?? 'publish',
  };
  if (input.excerpt) body.excerpt = input.excerpt;
  if (input.categories?.length) body.categories = input.categories;
  if (input.tags?.length) body.tags = input.tags;
  if (input.featuredMediaId) body.featured_media = input.featuredMediaId;
  if (input.date) body.date = input.date;

  const res = await fetch(apiUrl(creds.siteUrl, '/posts'), {
    method: 'POST',
    headers: {
      Authorization: authHeader(creds),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as {
    id?: number;
    link?: string;
    status?: string;
    message?: string;
    code?: string;
  };
  if (!res.ok || !data.id) {
    throw new Error(data.message ?? `WP create post failed (${res.status})`);
  }
  return {
    id: data.id,
    link: data.link ?? '',
    status: data.status ?? 'publish',
  };
}
