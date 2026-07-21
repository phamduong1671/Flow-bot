import assert from 'node:assert/strict';
import test from 'node:test';
import { createLangfuseObserver } from './langfuse.js';
import { createOpenAiProvider } from './providers/openai.js';

test('OpenAI adapter keeps the API key in the backend request and records usage', async () => {
  process.env.OPENAI_API_KEY = 'server-only-key';
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const provider = createOpenAiProvider({
    fetchImpl: (async (url, init) => {
      requests.push({ url: String(url), init });
      return new Response(
        JSON.stringify({
          model: 'test-model',
          output_text: 'hello',
          usage: { input_tokens: 3, output_tokens: 2, total_tokens: 5 },
        }),
        { status: 200 },
      );
    }) as typeof fetch,
  });
  const output = await provider.generate({ prompt: 'safe prompt', model: 'test-model' });
  assert.equal(output.text, 'hello');
  assert.equal(output.totalTokens, 5);
  assert.equal(
    (requests[0].init?.headers as Record<string, string>).Authorization,
    'Bearer server-only-key',
  );
  assert.ok(
    !JSON.stringify(JSON.parse(String(requests[0].init?.body))).includes('server-only-key'),
  );
});

test('OpenAI adapter estimates cost for dated models and cached input tokens', async () => {
  const pricingEnvironment = [
    'OPENAI_INPUT_COST_PER_MILLION',
    'OPENAI_CACHED_INPUT_COST_PER_MILLION',
    'OPENAI_OUTPUT_COST_PER_MILLION',
  ] as const;
  const previousValues = Object.fromEntries(
    pricingEnvironment.map((name) => [name, process.env[name]]),
  );
  for (const name of pricingEnvironment) delete process.env[name];

  try {
    process.env.OPENAI_API_KEY = 'server-only-key';
    const provider = createOpenAiProvider({
      fetchImpl: (async () =>
        new Response(
          JSON.stringify({
            model: 'gpt-4o-mini-2024-07-18',
            output_text: 'priced response',
            usage: {
              input_tokens: 1_000,
              input_tokens_details: { cached_tokens: 200 },
              output_tokens: 500,
              total_tokens: 1_500,
            },
          }),
          { status: 200 },
        )) as typeof fetch,
    });

    const output = await provider.generate({ prompt: 'price this response' });
    assert.equal(output.cachedInputTokens, 200);
    assert.ok(Math.abs(Number(output.costUsd) - 0.000435) < Number.EPSILON);
  } finally {
    for (const name of pricingEnvironment) {
      const previousValue = previousValues[name];
      if (previousValue === undefined) delete process.env[name];
      else process.env[name] = previousValue;
    }
  }
});

test('Langfuse creates one trace with node observations and fails open', async () => {
  process.env.LANGFUSE_PUBLIC_KEY = 'public';
  process.env.LANGFUSE_SECRET_KEY = 'secret';
  let batch: Array<{ type: string; body: Record<string, unknown> }> = [];
  const observer = createLangfuseObserver({
    fetchImpl: (async (_url, init) => {
      batch = (JSON.parse(String(init?.body)) as { batch: typeof batch }).batch;
      return new Response('{}', { status: 207 });
    }) as typeof fetch,
  });
  const node = {
    id: 'llm',
    type: 'llm' as const,
    label: 'LLM',
    position: { x: 0, y: 0 },
    data: { model: 'test-model' },
  };
  const result = await observer.observeRun(
    { runId: 'run', flowId: 'flow', userId: 'user', input: 'input' },
    () =>
      observer.observeNode({ runId: 'run', node, input: 'prompt' }, async () => ({
        output: 'answer',
        telemetry: {
          asType: 'generation',
          model: 'test-model',
          prompt: 'prompt',
          inputTokens: 2,
          outputTokens: 1,
          totalTokens: 3,
          latencyMs: 4,
        },
      })),
  );
  assert.equal(result.output, 'answer');
  assert.deepEqual(
    batch.map((event) => event.type),
    ['trace-create', 'generation-create'],
  );
  assert.equal(batch[1].body.traceId, 'run');

  const unavailable = createLangfuseObserver({
    fetchImpl: (async () => {
      throw new Error('offline');
    }) as typeof fetch,
    timeoutMs: 10,
  });
  const preserved = await unavailable.observeRun(
    { runId: 'run-2', flowId: 'flow', userId: 'user', input: null },
    async () => 'still works',
  );
  assert.equal(preserved, 'still works');
});
