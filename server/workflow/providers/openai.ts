import type { LlmOutput, WorkflowProviders } from '../engine.js';

type FetchLike = typeof fetch;

function numberFromEnv(name: string) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

export function createOpenAiProvider(
  options: { fetchImpl?: FetchLike; timeoutMs?: number } = {},
): WorkflowProviders['llm'] {
  const fetchImpl = options.fetchImpl || fetch;
  return {
    async generate({ prompt, systemPrompt, model }): Promise<LlmOutput> {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error('OPENAI_API_KEY is not configured on the server.');
      const selectedModel = model || process.env.OPENAI_MODEL || 'gpt-5.6-terra';
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
          usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
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
        const inputTokens = body.usage?.input_tokens;
        const outputTokens = body.usage?.output_tokens;
        const inputRate = numberFromEnv('OPENAI_INPUT_COST_PER_MILLION');
        const outputRate = numberFromEnv('OPENAI_OUTPUT_COST_PER_MILLION');
        const costUsd =
          inputTokens !== undefined &&
          outputTokens !== undefined &&
          inputRate !== undefined &&
          outputRate !== undefined
            ? (inputTokens * inputRate + outputTokens * outputRate) / 1_000_000
            : undefined;
        return {
          text,
          model: body.model || selectedModel,
          inputTokens,
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
