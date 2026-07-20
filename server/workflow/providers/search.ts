import type { SearchItem, SearchOutput, WorkflowProviders } from '../engine.js';

type FetchLike = typeof fetch;
type RawSearchItem = Record<string, unknown>;

function normalizeItem(item: RawSearchItem, index: number): SearchItem {
  const content = item.content ?? item.text ?? item.chunk ?? item.snippet ?? '';
  const score = Number(item.score);
  return {
    title: String(item.title ?? item.name ?? `Result ${index + 1}`),
    url: String(item.url ?? item.uri ?? item.source ?? ''),
    content: String(content),
    ...(Number.isFinite(score) ? { score } : {}),
  };
}

async function postJson(options: {
  url: string;
  provider: string;
  apiKey: string;
  body: Record<string, unknown>;
  timeoutMs: number;
  fetchImpl: FetchLike;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await options.fetchImpl(options.url, {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${options.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(options.body),
    });
    if (!response.ok)
      throw new Error(`${options.provider} request failed with status ${response.status}.`);
    return (await response.json()) as Record<string, unknown>;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError')
      throw new Error(`${options.provider} request timed out.`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function extractResults(body: Record<string, unknown>) {
  const candidates = body.results ?? body.documents ?? body.data ?? body.items ?? [];
  return Array.isArray(candidates)
    ? candidates.filter((item): item is RawSearchItem => Boolean(item) && typeof item === 'object')
    : [];
}

function normalizeVectorStoreItem(
  item: RawSearchItem,
  index: number,
  vectorStoreId: string,
): SearchItem {
  const chunks = Array.isArray(item.content)
    ? item.content
        .filter(
          (chunk): chunk is Record<string, unknown> => Boolean(chunk) && typeof chunk === 'object',
        )
        .map((chunk) => String(chunk.text || ''))
        .filter(Boolean)
    : [];
  const score = Number(item.score);
  const fileId = String(item.file_id || '');
  return {
    title: String(item.filename || `Vector store result ${index + 1}`),
    url: fileId ? `openai://vector-stores/${vectorStoreId}/files/${fileId}` : '',
    content: chunks.join('\n'),
    ...(Number.isFinite(score) ? { score } : {}),
  };
}

export function createOpenAiVectorStoreProvider(
  options: { fetchImpl?: FetchLike; timeoutMs?: number } = {},
): WorkflowProviders['ragSearch'] {
  const fetchImpl = options.fetchImpl || fetch;
  return {
    async search({ query, limit }): Promise<SearchOutput> {
      const apiKey = process.env.OPENAI_API_KEY;
      const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;
      if (!apiKey) throw new Error('OPENAI_API_KEY is not configured on the server.');
      if (!vectorStoreId)
        throw new Error('OPENAI_VECTOR_STORE_ID is not configured on the server.');
      const startedAt = performance.now();
      const body = await postJson({
        url: `${(process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')}/vector_stores/${encodeURIComponent(vectorStoreId)}/search`,
        provider: 'OpenAI Vector Store',
        apiKey,
        body: { query, max_num_results: Math.min(limit, 50) },
        fetchImpl,
        timeoutMs: options.timeoutMs || Number(process.env.SEARCH_TIMEOUT_MS) || 15_000,
      });
      return {
        provider: 'openai-vector-store',
        query,
        results: extractResults(body)
          .slice(0, limit)
          .map((item, index) => normalizeVectorStoreItem(item, index, vectorStoreId)),
        latencyMs: performance.now() - startedAt,
      };
    },
  };
}

export function createWebSearchProvider(
  options: { fetchImpl?: FetchLike; timeoutMs?: number } = {},
): WorkflowProviders['webSearch'] {
  const fetchImpl = options.fetchImpl || fetch;
  return {
    async search({ query, limit }): Promise<SearchOutput> {
      const apiKey = process.env.TAVILY_API_KEY;
      if (!apiKey) throw new Error('TAVILY_API_KEY is not configured on the server.');
      const startedAt = performance.now();
      const body = await postJson({
        url: `${(process.env.TAVILY_BASE_URL || 'https://api.tavily.com').replace(/\/$/, '')}/search`,
        provider: 'Tavily',
        apiKey,
        body: { query, max_results: limit, search_depth: 'basic', include_answer: false },
        fetchImpl,
        timeoutMs: options.timeoutMs || Number(process.env.SEARCH_TIMEOUT_MS) || 15_000,
      });
      return {
        provider: 'tavily',
        query,
        results: extractResults(body).slice(0, limit).map(normalizeItem),
        latencyMs: performance.now() - startedAt,
      };
    },
  };
}
