import assert from 'node:assert/strict';
import test from 'node:test';
import type { Flow, FlowNode } from '../types.js';
import {
  runWorkflow,
  validateWorkflow,
  WorkflowValidationError,
  type WorkflowProviders,
} from './engine.js';

const node = (id: string, type: FlowNode['type'], data: Record<string, string> = {}): FlowNode => ({
  id,
  type,
  label: id,
  position: { x: 0, y: 0 },
  data,
});
const edge = (source: string, target: string, label = 'next') => ({
  id: `${source}-${target}`,
  source,
  target,
  label,
});
const providers: WorkflowProviders = {
  ragSearch: {
    search: async ({ query }) => ({
      provider: 'test-rag',
      query,
      results: [{ title: 'RAG', url: 'rag://1', content: 'internal context' }],
      latencyMs: 1,
    }),
  },
  webSearch: {
    search: async ({ query }) => ({
      provider: 'test-web',
      query,
      results: [{ title: 'Web', url: 'https://example.com', content: 'public context' }],
      latencyMs: 1,
    }),
  },
  llm: {
    generate: async ({ prompt, model }) => ({
      text: `answer:${prompt}`,
      model: model || 'test-model',
      inputTokens: 4,
      outputTokens: 2,
      totalTokens: 6,
      latencyMs: 1,
    }),
  },
};

test('rejects cycles before execution', () => {
  const flow: Flow = {
    nodes: [node('input', 'input'), node('llm', 'llm')],
    edges: [edge('input', 'llm'), edge('llm', 'input')],
  };
  assert.throws(
    () => validateWorkflow(flow),
    (error) =>
      error instanceof WorkflowValidationError &&
      error.issues.some((issue) => issue.includes('cycle')),
  );
});

test('executes tools in graph order and interpolates their normalized output into LLM prompt', async () => {
  const flow: Flow = {
    nodes: [
      node('input', 'input', { variable: 'query' }),
      node('rag', 'rag_search', { query: '{{query}}', outputVariable: 'rag_results' }),
      node('web', 'web_search', { query: '{{query}}', outputVariable: 'web_results' }),
      node('llm', 'llm', {
        model: 'test-model',
        outputVariable: 'llm_output',
        prompt: 'RAG={{rag_results.results.0.content}} WEB={{web_results.results.0.content}}',
      }),
      node('output', 'output', { value: '{{llm_output}}' }),
    ],
    edges: [edge('input', 'rag'), edge('rag', 'web'), edge('web', 'llm'), edge('llm', 'output')],
  };
  const result = await runWorkflow({
    flowId: 'flow',
    userId: 'user',
    flow,
    input: 'question',
    providers,
  });
  assert.deepEqual(
    result.steps.map((step) => step.nodeId),
    ['input', 'rag', 'web', 'llm', 'output'],
  );
  assert.equal(result.output, 'answer:RAG=internal context WEB=public context');
  assert.deepEqual(result.topologicalOrder, ['input', 'rag', 'web', 'llm', 'output']);
});

test('reports dangling and unreachable nodes', () => {
  const flow: Flow = {
    nodes: [node('start', 'start'), node('orphan', 'message')],
    edges: [edge('start', 'missing')],
  };
  assert.throws(
    () => validateWorkflow(flow),
    (error) => {
      assert.ok(error instanceof WorkflowValidationError);
      assert.ok(error.issues.some((issue) => issue.includes('missing target')));
      assert.ok(error.issues.some((issue) => issue.includes('Unreachable')));
      return true;
    },
  );
});
