import type { WorkflowProviders } from '../engine.js';
import { createOpenAiProvider } from './openai.js';
import { createOpenAiVectorStoreProvider, createWebSearchProvider } from './search.js';

export function createWorkflowProviders(): WorkflowProviders {
  return {
    llm: createOpenAiProvider(),
    ragSearch: createOpenAiVectorStoreProvider(),
    webSearch: createWebSearchProvider(),
  };
}
