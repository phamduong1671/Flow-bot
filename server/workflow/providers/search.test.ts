import assert from 'node:assert/strict';
import test from 'node:test';
import { createOpenAiVectorStoreProvider, createWebSearchProvider } from './search.js';

test('search adapters normalize provider results', async () => {
  process.env.OPENAI_API_KEY = 'openai-secret';
  process.env.OPENAI_VECTOR_STORE_ID = 'vs_test';
  process.env.OPENAI_BASE_URL = 'https://api.openai.test/v1';
  process.env.TAVILY_API_KEY = 'tavily-secret';
  const requests: Array<{ url: string; authorization: string; body: Record<string, unknown> }> = [];
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    requests.push({
      url: String(url),
      authorization: (init?.headers as Record<string, string>).Authorization,
      body: JSON.parse(String(init?.body)) as Record<string, unknown>,
    });
    const responseBody = String(url).includes('vector_stores')
      ? {
          data: [
            {
              file_id: 'file_123',
              filename: 'handbook.pdf',
              score: 0.8,
              content: [
                { type: 'text', text: 'RAG content part 1' },
                { type: 'text', text: 'RAG content part 2' },
              ],
            },
          ],
        }
      : {
          results: [
            { title: 'Page', url: 'https://example.com', content: 'Web content', score: 0.9 },
          ],
        };
    return new Response(JSON.stringify(responseBody), { status: 200 });
  }) as typeof fetch;

  const rag = await createOpenAiVectorStoreProvider({ fetchImpl }).search({
    query: 'q',
    limit: 2,
  });
  const web = await createWebSearchProvider({ fetchImpl }).search({ query: 'q', limit: 2 });
  assert.deepEqual(rag.results[0], {
    title: 'handbook.pdf',
    url: 'openai://vector-stores/vs_test/files/file_123',
    content: 'RAG content part 1\nRAG content part 2',
    score: 0.8,
  });
  assert.deepEqual(web.results[0], {
    title: 'Page',
    url: 'https://example.com',
    content: 'Web content',
    score: 0.9,
  });
  assert.equal(requests[0].url, 'https://api.openai.test/v1/vector_stores/vs_test/search');
  assert.deepEqual(requests[0].body, { query: 'q', max_num_results: 2 });
  assert.equal(requests[0].authorization, 'Bearer openai-secret');
  assert.equal(requests[1].authorization, 'Bearer tavily-secret');
  assert.ok(!JSON.stringify(requests.map((request) => request.body)).includes('secret'));
});

test('search adapter aborts on timeout with a normalized error', async () => {
  process.env.TAVILY_API_KEY = 'secret';
  const provider = createWebSearchProvider({
    timeoutMs: 5,
    fetchImpl: ((_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        );
      })) as typeof fetch,
  });
  await assert.rejects(() => provider.search({ query: 'q', limit: 1 }), /Tavily request timed out/);
});
