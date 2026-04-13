/**
 * Drop-in client for the local Gemma API gateway (C:\projects\gemma).
 *
 * Env: GEMMA_API_URL (default http://localhost:8080)
 *
 * Mirrors the call surface previously handled by gemini.provider for
 * text-only and grounded generation. Image + PDF remain on Gemini.
 */

export interface GenResponse {
  text: string;
  model: string;
  usage: Record<string, number>;
}

export interface Source {
  title: string;
  url: string;
  snippet: string;
}

export interface ResearchResponse extends GenResponse {
  sources: Source[];
  images?: string[];
}

type FetchOpts = { signal?: AbortSignal; timeoutMs?: number };

const BASE_URL = (process.env.GEMMA_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');

async function post<T>(path: string, body: unknown, opts: FetchOpts = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = opts.timeoutMs ?? 10 * 60 * 1000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const signal = opts.signal ? anySignal([opts.signal, controller.signal]) : controller.signal;

  try {
    const resp = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`Gemma ${path} ${resp.status}: ${text}`);
    }
    return (await resp.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const s of signals) {
    if (s.aborted) {
      controller.abort();
      break;
    }
    s.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return controller.signal;
}

export async function summarize(
  text: string,
  opts?: { style?: 'bullets' | 'paragraph' | 'outline'; language?: 'ko' | 'en' } & FetchOpts,
): Promise<string> {
  const { signal, timeoutMs, ...rest } = opts ?? {};
  const r = await post<GenResponse>('/v1/summarize', { text, ...rest }, { signal, timeoutMs });
  return r.text;
}

export async function refine(
  text: string,
  opts?: {
    instructions?: string;
    tone?: 'neutral' | 'formal' | 'casual' | 'academic';
    language?: 'ko' | 'en';
  } & FetchOpts,
): Promise<string> {
  const { signal, timeoutMs, ...rest } = opts ?? {};
  const r = await post<GenResponse>('/v1/refine', { text, ...rest }, { signal, timeoutMs });
  return r.text;
}

export async function research(
  query: string,
  opts?: {
    maxResults?: number;
    searchDepth?: 'basic' | 'advanced';
    language?: 'ko' | 'en';
    includeImages?: boolean;
    searchQuery?: string;
    prompt?: string;
  } & FetchOpts,
): Promise<ResearchResponse> {
  const { signal, timeoutMs, maxResults, searchDepth, includeImages, searchQuery, prompt, ...rest } = opts ?? {};
  return post<ResearchResponse>(
    '/v1/research',
    {
      query,
      max_results: maxResults,
      search_depth: searchDepth,
      include_images: includeImages,
      search_query: searchQuery,
      prompt,
      ...rest,
    },
    { signal, timeoutMs },
  );
}

export async function vision(
  prompt: string,
  images: string[],
  opts?: { temperature?: number; system?: string } & FetchOpts,
): Promise<string> {
  const { signal, timeoutMs, ...rest } = opts ?? {};
  const r = await post<{ text: string; model: string }>(
    '/v1/vision',
    { prompt, images, ...rest },
    { signal, timeoutMs: timeoutMs ?? 10 * 60 * 1000 },
  );
  return r.text;
}

export async function generate(
  prompt: string,
  opts?: {
    system?: string;
    temperature?: number;
    maxTokens?: number;
  } & FetchOpts,
): Promise<string> {
  const { signal, timeoutMs, maxTokens, ...rest } = opts ?? {};
  const r = await post<GenResponse>(
    '/v1/generate',
    { prompt, max_tokens: maxTokens, ...rest },
    { signal, timeoutMs },
  );
  return r.text;
}

export async function health(): Promise<{
  status: string;
  ollama: boolean;
  model: string;
  model_loaded: boolean;
  tavily_configured: boolean;
}> {
  const resp = await fetch(`${BASE_URL}/health`);
  if (!resp.ok) throw new Error(`Gemma /health ${resp.status}`);
  return resp.json() as Promise<any>;
}
