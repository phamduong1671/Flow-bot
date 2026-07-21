import {
  Bot,
  BrainCircuit,
  Database,
  GitBranch,
  LogOut,
  MessageSquareText,
  Play,
  Search,
  WandSparkles,
} from 'lucide-react';

export const CANVAS_WIDTH = 4200;
export const CANVAS_HEIGHT = 2800;
export const CANVAS_EXPANSION_PADDING = 900;
export const NODE_WIDTH = 224;
export const NODE_HEIGHT = 112;
export const HEADER_HEIGHT = 76;
export const MIN_ZOOM = 0.45;
export const MAX_ZOOM = 1.8;
export const MAX_RUN_STEPS = 80;
export const FLOW_STORAGE_KEY = 'flow-bot-builder-state';

export const NODE_TYPES = {
  start: {
    title: 'Start',
    description: 'Conversation entry point',
    color: 'border-emerald-400 bg-emerald-50 text-emerald-900',
    accent: 'bg-emerald-500',
    icon: Play,
    defaults: { message: 'Hello! How can I help you?' },
  },
  input: {
    title: 'Input',
    description: 'Workflow input variable',
    color: 'border-teal-400 bg-teal-50 text-teal-950',
    accent: 'bg-teal-500',
    icon: Play,
    defaults: { variable: 'query', defaultValue: '' },
  },
  message: {
    title: 'Message',
    description: 'Bot sends a message',
    color: 'border-sky-400 bg-sky-50 text-sky-950',
    accent: 'bg-sky-500',
    icon: MessageSquareText,
    defaults: { message: 'This is a bot message.' },
  },
  question: {
    title: 'Question',
    description: 'Ask and store an answer',
    color: 'border-violet-400 bg-violet-50 text-violet-950',
    accent: 'bg-violet-500',
    icon: Bot,
    defaults: { message: 'Which plan do you want?', variable: 'plan' },
  },
  condition: {
    title: 'Condition',
    description: 'Branch by a condition',
    color: 'border-amber-400 bg-amber-50 text-amber-950',
    accent: 'bg-amber-500',
    icon: GitBranch,
    defaults: { variable: 'plan', condition: 'equals premium' },
  },
  action: {
    title: 'Action',
    description: 'Call API or process data',
    color: 'border-rose-400 bg-rose-50 text-rose-950',
    accent: 'bg-rose-500',
    icon: WandSparkles,
    defaults: { action: 'create_lead', payload: '{"source":"bot"}' },
  },
  rag_search: {
    title: 'RAG Search',
    description: 'Search internal knowledge',
    color: 'border-cyan-400 bg-cyan-50 text-cyan-950',
    accent: 'bg-cyan-600',
    icon: Database,
    defaults: { query: '{{query}}', outputVariable: 'rag_results', limit: '3' },
  },
  web_search: {
    title: 'Web Search',
    description: 'Search current web sources',
    color: 'border-blue-400 bg-blue-50 text-blue-950',
    accent: 'bg-blue-600',
    icon: Search,
    defaults: { query: '{{query}}', outputVariable: 'web_results', limit: '3' },
  },
  llm: {
    title: 'LLM',
    description: 'Generate with a backend model',
    color: 'border-fuchsia-400 bg-fuchsia-50 text-fuchsia-950',
    accent: 'bg-fuchsia-600',
    icon: BrainCircuit,
    defaults: {
      model: 'gpt-4o-mini',
      systemPrompt: 'Answer accurately using the supplied context.',
      prompt:
        'Question: {{query}}\n\nRAG context: {{rag_results.results}}\n\nWeb context: {{web_results.results}}',
      outputVariable: 'llm_output',
    },
  },
  output: {
    title: 'Output',
    description: 'Return the workflow result',
    color: 'border-slate-400 bg-slate-100 text-slate-950',
    accent: 'bg-slate-700',
    icon: LogOut,
    defaults: { value: '{{llm_output}}' },
  },
};
