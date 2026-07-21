import type { LlmOutput, WorkflowProviders } from '../engine.js';

type FetchLike = typeof fetch;

type ModelPricing = {
  input: number;
  cachedInput: number;
  output: number;
};

// Standard processing prices in USD per 1M tokens. Environment variables below
// remain available as overrides for custom endpoints and negotiated pricing.
const MODEL_PRICING: Record<string, ModelPricing> = {
  'gpt-5.6-sol': { input: 5, cachedInput: 0.5, output: 30 },
  'gpt-5.6-terra': { input: 2.5, cachedInput: 0.25, output: 15 },
  'gpt-5.6-luna': { input: 1, cachedInput: 0.1, output: 6 },
  'gpt-4.1': { input: 2, cachedInput: 0.5, output: 8 },
  'gpt-4.1-mini': { input: 0.4, cachedInput: 0.1, output: 1.6 },
  'gpt-4.1-nano': { input: 0.1, cachedInput: 0.025, output: 0.4 },
  'gpt-4o': { input: 2.5, cachedInput: 1.25, output: 10 },
  'gpt-4o-mini': { input: 0.15, cachedInput: 0.075, output: 0.6 },
};

function numberFromEnv(name: string) {
  const rawValue = process.env[name]?.trim();
  if (!rawValue) return undefined;
  const value = Number(rawValue);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

function getModelPricing(model: string) {
  const normalizedModel = model.trim().toLowerCase();
  return Object.entries(MODEL_PRICING).find(([modelName]) => {
    if (normalizedModel === modelName) return true;
    if (!normalizedModel.startsWith(`${modelName}-`)) return false;
    return /^\d{4}-\d{2}-\d{2}$/.test(normalizedModel.slice(modelName.length + 1));
  })?.[1];
}

function estimateCost(input: {
  model: string;
  inputTokens?: number;
  cachedInputTokens?: number;
  outputTokens?: number;
}) {
  if (input.inputTokens === undefined || input.outputTokens === undefined) return undefined;

  const modelPricing = getModelPricing(input.model);
  const configuredInputRate = numberFromEnv('OPENAI_INPUT_COST_PER_MILLION');
  const inputRate = configuredInputRate ?? modelPricing?.input;
  const outputRate = numberFromEnv('OPENAI_OUTPUT_COST_PER_MILLION') ?? modelPricing?.output;
  const cachedInputRate =
    numberFromEnv('OPENAI_CACHED_INPUT_COST_PER_MILLION') ??
    (configuredInputRate === undefined ? modelPricing?.cachedInput : configuredInputRate);
  if (inputRate === undefined || outputRate === undefined) return undefined;

  const cachedInputTokens = Math.min(input.inputTokens, Math.max(0, input.cachedInputTokens || 0));
  const uncachedInputTokens = input.inputTokens - cachedInputTokens;
  return (
    (uncachedInputTokens * inputRate +
      cachedInputTokens * (cachedInputRate ?? inputRate) +
      input.outputTokens * outputRate) /
    1_000_000
  );
}

export function createOpenAiProvider(
  options: { fetchImpl?: FetchLike; timeoutMs?: number } = {},
): WorkflowProviders['llm'] {
  const fetchImpl = options.fetchImpl || fetch;
  return {
    async generate({ prompt, systemPrompt, model }): Promise<LlmOutput> {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error('OPENAI_API_KEY is not configured on the server.');
      const selectedModel = model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        options.timeoutMs || Number(process.env.LLM_TIMEOUT_MS) || 60_000,
      );
      const startedAt = performance.now();
      try {
        const response = await fetchImpl(
          `${(process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')}/responses`,
          {
            method: 'POST',
            signal: controller.signal,
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: selectedModel,
              input: prompt,
              ...(systemPrompt ? { instructions: systemPrompt } : {}),
            }),
          },
        );
        if (!response.ok) throw new Error(`OpenAI request failed with status ${response.status}.`);
        const body = (await response.json()) as {
          model?: string;
          output_text?: string;
          output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
          usage?: {
            input_tokens?: number;
            input_tokens_details?: { cached_tokens?: number };
            output_tokens?: number;
            total_tokens?: number;
          };
        };
        const text =
          body.output_text ||
          body.output
            ?.flatMap((item) => item.content || [])
            .filter((content) => content.type === 'output_text' || typeof content.text === 'string')
            .map((content) => content.text || '')
            .join('') ||
          '';
        if (!text) throw new Error('OpenAI returned no text output.');
        const usedModel = body.model || selectedModel;
        const inputTokens = body.usage?.input_tokens;
        const cachedInputTokens = body.usage?.input_tokens_details?.cached_tokens;
        const outputTokens = body.usage?.output_tokens;
        const costUsd = estimateCost({
          model: usedModel,
          inputTokens,
          cachedInputTokens,
          outputTokens,
        });
        return {
          text,
          model: usedModel,
          inputTokens,
          cachedInputTokens,
          outputTokens,
          totalTokens: body.usage?.total_tokens,
          costUsd,
          latencyMs: performance.now() - startedAt,
        };
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError')
          throw new Error('OpenAI request timed out.');
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
