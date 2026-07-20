import crypto from 'node:crypto';
import type { Flow, FlowEdge, FlowNode } from '../types.js';
import { getVariable, resolveTemplate, type WorkflowVariables } from './variables.js';

export type SearchItem = { title: string; url: string; content: string; score?: number };
export type SearchOutput = {
  provider: string;
  query: string;
  results: SearchItem[];
  latencyMs: number;
};
export type LlmOutput = {
  text: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  costUsd?: number;
  latencyMs: number;
};

export type WorkflowProviders = {
  llm: {
    generate: (input: {
      prompt: string;
      systemPrompt?: string;
      model?: string;
    }) => Promise<LlmOutput>;
  };
  ragSearch: { search: (input: { query: string; limit: number }) => Promise<SearchOutput> };
  webSearch: { search: (input: { query: string; limit: number }) => Promise<SearchOutput> };
};

export type NodeStep = {
  nodeId: string;
  type: FlowNode['type'];
  output: unknown;
  latencyMs: number;
  telemetry?: Record<string, unknown>;
};

type ObservedNodeResult = { output: unknown; telemetry?: Record<string, unknown> };
export type WorkflowObserver = {
  observeRun<T>(
    details: { runId: string; flowId: string; userId: string; input: unknown },
    execute: () => Promise<T>,
  ): Promise<T>;
  observeNode<T extends ObservedNodeResult>(
    details: { runId: string; node: FlowNode; input: unknown },
    execute: () => Promise<T>,
  ): Promise<T>;
};

const noopObserver: WorkflowObserver = {
  observeRun: (_details, execute) => execute(),
  observeNode: (_details, execute) => execute(),
};

export class WorkflowValidationError extends Error {
  constructor(public issues: string[]) {
    super(issues.join(' '));
    this.name = 'WorkflowValidationError';
  }
}

export class NodeExecutionError extends Error {
  constructor(
    public nodeId: string,
    message: string,
    public code = 'NODE_EXECUTION_FAILED',
  ) {
    super(message);
    this.name = 'NodeExecutionError';
  }
}

export function validateWorkflow(flow: Flow) {
  const issues: string[] = [];
  const allowedNodeTypes = new Set([
    'start',
    'input',
    'message',
    'question',
    'condition',
    'action',
    'rag_search',
    'web_search',
    'llm',
    'output',
  ]);
  const nodeIds = new Set<string>();
  for (const node of flow.nodes) {
    if (nodeIds.has(node.id)) issues.push(`Duplicate node id: ${node.id}.`);
    if (!allowedNodeTypes.has(node.type))
      issues.push(`Unsupported node type on ${node.id}: ${node.type}.`);
    nodeIds.add(node.id);
  }

  const entryNodes = flow.nodes.filter((node) => node.type === 'start' || node.type === 'input');
  if (entryNodes.length !== 1)
    issues.push('Workflow must contain exactly one Start or Input entry node.');
  for (const edge of flow.edges) {
    if (!nodeIds.has(edge.source))
      issues.push(`Edge ${edge.id} has missing source ${edge.source}.`);
    if (!nodeIds.has(edge.target))
      issues.push(`Edge ${edge.id} has missing target ${edge.target}.`);
  }

  const indegree = new Map(flow.nodes.map((node) => [node.id, 0]));
  const outgoing = new Map<string, FlowEdge[]>();
  for (const edge of flow.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    indegree.set(edge.target, (indegree.get(edge.target) || 0) + 1);
    outgoing.set(edge.source, [...(outgoing.get(edge.source) || []), edge]);
  }
  for (const node of flow.nodes) {
    if (node.type !== 'condition' && (outgoing.get(node.id)?.length || 0) > 1) {
      issues.push(`Node ${node.id} has multiple outgoing edges but is not a Condition node.`);
    }
  }

  const queue = flow.nodes.filter((node) => indegree.get(node.id) === 0).map((node) => node.id);
  const topologicalOrder: string[] = [];
  while (queue.length) {
    const nodeId = queue.shift()!;
    topologicalOrder.push(nodeId);
    for (const edge of outgoing.get(nodeId) || []) {
      const nextDegree = (indegree.get(edge.target) || 0) - 1;
      indegree.set(edge.target, nextDegree);
      if (nextDegree === 0) queue.push(edge.target);
    }
  }
  if (topologicalOrder.length !== flow.nodes.length) issues.push('Workflow contains a cycle.');

  if (entryNodes.length === 1) {
    const reachable = new Set<string>();
    const pending = [entryNodes[0].id];
    while (pending.length) {
      const nodeId = pending.pop()!;
      if (reachable.has(nodeId)) continue;
      reachable.add(nodeId);
      for (const edge of outgoing.get(nodeId) || []) pending.push(edge.target);
    }
    const unreachable = flow.nodes.filter((node) => !reachable.has(node.id)).map((node) => node.id);
    if (unreachable.length) issues.push(`Unreachable nodes: ${unreachable.join(', ')}.`);
  }

  if (issues.length) throw new WorkflowValidationError(issues);
  return { entryNodeId: entryNodes[0].id, topologicalOrder, outgoing };
}

function conditionResult(node: FlowNode, variables: WorkflowVariables) {
  const value = String(getVariable(variables, node.data.variable) ?? '')
    .trim()
    .toLowerCase();
  const condition = String(node.data.condition || '')
    .trim()
    .toLowerCase();
  if (!condition) return Boolean(value);
  if (condition.startsWith('not equals ')) return value !== condition.slice(11).trim();
  if (condition.startsWith('equals ')) return value === condition.slice(7).trim();
  if (condition.startsWith('contains ')) return value.includes(condition.slice(9).trim());
  return value === condition;
}

function nextTarget(node: FlowNode, edges: FlowEdge[], variables: WorkflowVariables) {
  if (!edges.length) return undefined;
  if (node.type !== 'condition')
    return edges.find((edge) => edge.label?.toLowerCase() === 'next')?.target || edges[0].target;
  const result = conditionResult(node, variables);
  const label = result ? 'true' : 'false';
  return (
    edges.find((edge) => edge.label?.toLowerCase() === label)?.target ||
    edges[result ? 0 : 1]?.target ||
    edges[0].target
  );
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 20) : fallback;
}

async function executeNode(
  node: FlowNode,
  variables: WorkflowVariables,
  providers: WorkflowProviders,
  initialInput: unknown,
): Promise<ObservedNodeResult> {
  const outputVariable = node.data.outputVariable || node.id;
  if (node.type === 'start') return { output: resolveTemplate(node.data.message, variables) };
  if (node.type === 'input') {
    const variable = node.data.variable || 'input';
    const output =
      initialInput && typeof initialInput === 'object'
        ? (getVariable(initialInput as WorkflowVariables, variable) ?? initialInput)
        : initialInput;
    variables[variable] = output ?? node.data.defaultValue ?? '';
    return { output: variables[variable] };
  }
  if (node.type === 'message') return { output: resolveTemplate(node.data.message, variables) };
  if (node.type === 'question') {
    const variable = node.data.variable || node.id;
    const output = getVariable(variables, variable);
    if (output === undefined)
      throw new NodeExecutionError(
        node.id,
        `Missing input variable: ${variable}.`,
        'MISSING_INPUT',
      );
    return { output };
  }
  if (node.type === 'condition') return { output: conditionResult(node, variables) };
  if (node.type === 'action') {
    let payload: unknown = resolveTemplate(node.data.payload || '{}', variables);
    try {
      payload = JSON.parse(String(payload));
    } catch {
      /* Keep interpolated text. */
    }
    const output = { action: node.data.action || 'unnamed', payload };
    variables[outputVariable] = output;
    return { output };
  }
  if (node.type === 'rag_search' || node.type === 'web_search') {
    const query = resolveTemplate(node.data.query || '{{input}}', variables);
    if (!query.trim())
      throw new NodeExecutionError(node.id, 'Search query is empty.', 'INVALID_INPUT');
    const provider = node.type === 'rag_search' ? providers.ragSearch : providers.webSearch;
    const output = await provider.search({ query, limit: positiveInteger(node.data.limit, 5) });
    variables[outputVariable] = output;
    return {
      output,
      telemetry: { asType: 'retriever', provider: output.provider, latencyMs: output.latencyMs },
    };
  }
  if (node.type === 'llm') {
    const prompt = resolveTemplate(node.data.prompt, variables);
    if (!prompt.trim())
      throw new NodeExecutionError(node.id, 'LLM prompt is empty.', 'INVALID_INPUT');
    const output = await providers.llm.generate({
      prompt,
      systemPrompt: resolveTemplate(node.data.systemPrompt, variables) || undefined,
      model: node.data.model || undefined,
    });
    variables[outputVariable] = output.text;
    return {
      output: output.text,
      telemetry: {
        asType: 'generation',
        model: output.model,
        prompt,
        inputTokens: output.inputTokens,
        outputTokens: output.outputTokens,
        totalTokens: output.totalTokens,
        costUsd: output.costUsd,
        latencyMs: output.latencyMs,
      },
    };
  }
  if (node.type === 'output')
    return { output: resolveTemplate(node.data.value || '{{llm_output}}', variables) };
  throw new NodeExecutionError(node.id, `Unsupported node type: ${node.type}.`, 'UNSUPPORTED_NODE');
}

export async function runWorkflow(options: {
  flowId: string;
  userId: string;
  flow: Flow;
  input?: unknown;
  variables?: WorkflowVariables;
  providers: WorkflowProviders;
  observer?: WorkflowObserver;
}) {
  const runId = crypto.randomUUID();
  const startedAt = new Date();
  const startedAtPerformance = performance.now();
  const observer = options.observer || noopObserver;
  const variables: WorkflowVariables = { ...(options.variables || {}) };
  const steps: NodeStep[] = [];

  return observer.observeRun(
    { runId, flowId: options.flowId, userId: options.userId, input: options.input },
    async () => {
      const validation = validateWorkflow(options.flow);
      const nodeMap = new Map(options.flow.nodes.map((node) => [node.id, node]));
      let currentNodeId: string | undefined = validation.entryNodeId;
      while (currentNodeId) {
        const node = nodeMap.get(currentNodeId)!;
        const startedAt = performance.now();
        try {
          const result = await observer.observeNode({ runId, node, input: { variables } }, () =>
            executeNode(node, variables, options.providers, options.input),
          );
          variables[node.id] = result.output;
          steps.push({
            nodeId: node.id,
            type: node.type,
            output: result.output,
            latencyMs: performance.now() - startedAt,
            telemetry: result.telemetry,
          });
          currentNodeId = nextTarget(node, validation.outgoing.get(node.id) || [], variables);
        } catch (error) {
          if (error instanceof NodeExecutionError) throw error;
          throw new NodeExecutionError(
            node.id,
            error instanceof Error ? error.message : 'Node execution failed.',
          );
        }
      }

      return {
        runId,
        status: 'completed' as const,
        startedAt: startedAt.toISOString(),
        endedAt: new Date().toISOString(),
        latencyMs: performance.now() - startedAtPerformance,
        output: steps[steps.length - 1]?.output,
        variables,
        steps,
        topologicalOrder: validation.topologicalOrder,
      };
    },
  );
}
