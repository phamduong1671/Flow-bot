import crypto from 'node:crypto';
import type { WorkflowObserver } from './engine.js';

type IngestionEvent = {
  id: string;
  type: string;
  timestamp: string;
  body: Record<string, unknown>;
};
type FetchLike = typeof fetch;

function safeError(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown execution error.';
}

export function createLangfuseObserver(
  options: { fetchImpl?: FetchLike; timeoutMs?: number } = {},
): WorkflowObserver {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  const baseUrl = (process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com').replace(
    /\/$/,
    '',
  );
  const fetchImpl = options.fetchImpl || fetch;
  const enabled = Boolean(publicKey && secretKey);
  let events: IngestionEvent[] = [];
  let traceId = '';

  async function flush() {
    if (!enabled || !events.length) return;
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      options.timeoutMs || Number(process.env.LANGFUSE_TIMEOUT_MS) || 2_000,
    );
    const batch = events;
    events = [];
    try {
      const response = await fetchImpl(`${baseUrl}/api/public/ingestion`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Basic ${Buffer.from(`${publicKey}:${secretKey}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ batch }),
      });
      if (!response.ok && response.status !== 207)
        throw new Error('Langfuse ingestion rejected the batch.');
    } catch {
      // Observability must never alter the workflow result and credentials are never logged.
      console.warn('Langfuse export failed; workflow result was preserved.');
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    async observeRun(details, execute) {
      if (!enabled) return execute();
      traceId = details.runId;
      const timestamp = new Date().toISOString();
      const traceEvent: IngestionEvent = {
        id: crypto.randomUUID(),
        type: 'trace-create',
        timestamp,
        body: {
          id: traceId,
          name: 'workflow-run',
          timestamp,
          userId: details.userId,
          input: details.input,
          metadata: { flowId: details.flowId, runId: details.runId },
          tags: ['flow-bot'],
        },
      };
      events.push(traceEvent);
      try {
        const result = await execute();
        traceEvent.body.output = result;
        return result;
      } catch (error) {
        traceEvent.body.output = { status: 'error', message: safeError(error) };
        throw error;
      } finally {
        await flush();
      }
    },

    async observeNode(details, execute) {
      if (!enabled) return execute();
      const startTime = new Date().toISOString();
      const observationId = crypto.randomUUID();
      try {
        const result = await execute();
        const telemetry = result.telemetry || {};
        const generation = details.node.type === 'llm' || telemetry.asType === 'generation';
        const usageDetails = {
          input: telemetry.inputTokens,
          input_cached: telemetry.cachedInputTokens,
          output: telemetry.outputTokens,
          total: telemetry.totalTokens,
        };
        const costDetails =
          telemetry.costUsd === undefined ? undefined : { total: telemetry.costUsd };
        events.push({
          id: crypto.randomUUID(),
          type: generation ? 'generation-create' : 'span-create',
          timestamp: startTime,
          body: {
            id: observationId,
            traceId,
            name: `${details.node.type}:${details.node.label}`,
            startTime,
            endTime: new Date().toISOString(),
            input: generation ? telemetry.prompt : details.input,
            output: result.output,
            metadata: {
              nodeId: details.node.id,
              nodeType: details.node.type,
              latencyMs: telemetry.latencyMs,
            },
            ...(generation
              ? { model: telemetry.model || details.node.data.model, usageDetails, costDetails }
              : {}),
          },
        });
        return result;
      } catch (error) {
        events.push({
          id: crypto.randomUUID(),
          type: details.node.type === 'llm' ? 'generation-create' : 'span-create',
          timestamp: startTime,
          body: {
            id: observationId,
            traceId,
            name: `${details.node.type}:${details.node.label}`,
            startTime,
            endTime: new Date().toISOString(),
            input: details.input,
            level: 'ERROR',
            statusMessage: safeError(error),
            metadata: { nodeId: details.node.id, nodeType: details.node.type },
            ...(details.node.type === 'llm' ? { model: details.node.data.model } : {}),
          },
        });
        throw error;
      }
    },
  };
}
