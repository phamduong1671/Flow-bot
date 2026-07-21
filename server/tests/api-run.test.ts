import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import type { Server } from 'node:http';
import test from 'node:test';
import sampleFlow from '../../examples/sample-flow.json';
import type { WorkflowObserver, WorkflowProviders } from '../workflow/engine.js';
import { createTestStore } from './test-store.js';

process.env.JWT_SECRET = 'integration-test-secret';
process.env.ANONYMOUS_ALLOWED_MODELS = 'gpt-4o-mini';
const { createApp } = await import('../app.js');

let traceCount = 0;
let observationCount = 0;
let tracedUserId = '';
const observer: WorkflowObserver = {
  observeRun: async (details, execute) => {
    traceCount += 1;
    tracedUserId = details.userId;
    return execute();
  },
  observeNode: async (_details, execute) => {
    observationCount += 1;
    return execute();
  },
};
const providers: WorkflowProviders = {
  ragSearch: {
    search: async ({ query }) => ({
      provider: 'integration-rag',
      query,
      results: [{ title: 'Internal', url: 'rag://1', content: 'RAG improves grounded answers.' }],
      latencyMs: 1,
    }),
  },
  webSearch: {
    search: async ({ query }) => ({
      provider: 'integration-web',
      query,
      results: [
        { title: 'Web', url: 'https://example.com', content: 'Web search adds fresh context.' },
      ],
      latencyMs: 1,
    }),
  },
  llm: {
    generate: async ({ prompt, model }) => ({
      text: `Integrated answer (${prompt.includes('grounded') && prompt.includes('fresh')})`,
      model: model || 'integration-model',
      inputTokens: 10,
      outputTokens: 4,
      totalTokens: 14,
      latencyMs: 1,
    }),
  },
};
const store = createTestStore();
const server = await new Promise<Server>((resolve) => {
  const instance = createApp({
    providers,
    observerFactory: () => observer,
    store,
    anonymousRateLimit: { limit: 3, windowMs: 60_000 },
  }).listen(0, () => resolve(instance));
});
server.unref();
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Integration server did not bind.');
const baseUrl = `http://127.0.0.1:${address.port}`;

test.after(async () => {
  server.closeAllConnections();
  server.close();
  await store.close();
});

function api(pathname: string, options: { method?: string; token?: string; body?: unknown } = {}) {
  const requestBody = options.body === undefined ? undefined : JSON.stringify(options.body);
  return new Promise<{ status: number; body: Record<string, unknown> }>((resolve, reject) => {
    const request = httpRequest(
      `${baseUrl}${pathname}`,
      {
        method: options.method || 'GET',
        agent: false,
        headers: {
          ...(requestBody
            ? {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(requestBody),
              }
            : {}),
          ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        },
      },
      (response) => {
        let text = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          text += chunk;
        });
        response.on('end', () =>
          resolve({ status: response.statusCode || 0, body: text ? JSON.parse(text) : {} }),
        );
      },
    );
    request.on('error', reject);
    if (requestBody) request.write(requestBody);
    request.end();
  });
}

async function register(email: string) {
  const response = await api('/api/auth/register', {
    method: 'POST',
    body: { email, password: 'password-123' },
  });
  assert.equal(response.status, 201);
  return (response.body as { token: string }).token;
}

test('sample flow runs end-to-end through authenticated owner API', async () => {
  const ownerToken = await register('run-owner@example.com');
  const strangerToken = await register('run-stranger@example.com');
  const created = await api('/api/flows', {
    method: 'POST',
    token: ownerToken,
    body: { name: 'Sample', ...sampleFlow },
  });
  assert.equal(created.status, 201);
  const flowId = (created.body as { flow: { id: string } }).flow.id;

  assert.equal(
    (
      await api(`/api/flows/${flowId}/runs`, {
        method: 'POST',
        token: strangerToken,
        body: { input: 'question' },
      })
    ).status,
    404,
  );
  const executed = await api(`/api/flows/${flowId}/runs`, {
    method: 'POST',
    token: ownerToken,
    body: { input: 'question' },
  });
  assert.equal(executed.status, 200);
  const run = (
    executed.body as {
      run: {
        output: string;
        startedAt: string;
        endedAt: string;
        latencyMs: number;
        steps: Array<{
          nodeId: string;
          telemetry?: { totalTokens?: number; model?: string };
        }>;
      };
    }
  ).run;
  assert.equal(run.output, 'Integrated answer (true)');
  assert.ok(Date.parse(run.startedAt));
  assert.ok(Date.parse(run.endedAt));
  assert.ok(run.latencyMs >= 0);
  assert.deepEqual(
    run.steps.map((step) => step.nodeId),
    ['sample-input', 'sample-rag', 'sample-web', 'sample-llm', 'sample-output'],
  );
  assert.equal(run.steps.find((step) => step.nodeId === 'sample-llm')?.telemetry?.totalTokens, 14);
  assert.equal(traceCount, 1);
  assert.equal(observationCount, 5);
});

test('anonymous API runs JSON without saving it and enforces safety limits', async () => {
  const executed = await api('/api/runs/anonymous', {
    method: 'POST',
    body: { input: 'anonymous question', flow: sampleFlow },
  });
  assert.equal(executed.status, 200);
  assert.match(tracedUserId, /^anonymous:[0-9a-f-]{36}$/);
  assert.equal((await store.listFlows(tracedUserId)).length, 0);

  const unsafeFlow = structuredClone(sampleFlow);
  (unsafeFlow.nodes[0].data as Record<string, string>).apiKey = 'must-not-be-accepted';
  const unsafe = await api('/api/runs/anonymous', {
    method: 'POST',
    body: { input: 'question', flow: unsafeFlow },
  });
  assert.equal(unsafe.status, 400);
  assert.equal(unsafe.body.code, 'UNSAFE_ANONYMOUS_FLOW');

  const oversized = await api('/api/runs/anonymous', {
    method: 'POST',
    body: {
      input: 'question',
      flow: { nodes: Array.from({ length: 51 }, () => sampleFlow.nodes[0]), edges: [] },
    },
  });
  assert.equal(oversized.status, 400);
  assert.equal(oversized.body.code, 'UNSAFE_ANONYMOUS_FLOW');

  const rateLimited = await api('/api/runs/anonymous', {
    method: 'POST',
    body: { input: 'question', flow: sampleFlow },
  });
  assert.equal(rateLimited.status, 429);
  assert.equal(rateLimited.body.code, 'ANONYMOUS_RATE_LIMITED');
});
