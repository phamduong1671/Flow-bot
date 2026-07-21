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
    help: 'Entry point of the workflow. It starts the run and can send an opening message.',
    fieldHelp: {
      message: 'Optional opening message sent when the workflow starts.',
    },
    color: 'border-emerald-400 bg-emerald-50 text-emerald-900',
    accent: 'bg-emerald-500',
    icon: Play,
    defaults: { message: 'Hello! How can I help you?' },
  },
  input: {
    title: 'Input',
    description: 'Workflow input variable',
    help: 'Stores the first user input into a named variable for later nodes.',
    fieldHelp: {
      variable: 'Variable name used by later nodes, for example {{query}}.',
      defaultValue: 'Fallback value when the run starts without user input.',
    },
    color: 'border-teal-400 bg-teal-50 text-teal-950',
    accent: 'bg-teal-500',
    icon: Play,
    defaults: { variable: 'query', defaultValue: '' },
  },
  message: {
    title: 'Message',
    description: 'Bot sends a message',
    help: 'Sends a fixed or templated message without waiting for a reply.',
    fieldHelp: {
      message: 'Message text. You can insert variables like {{query}}.',
    },
    color: 'border-sky-400 bg-sky-50 text-sky-950',
    accent: 'bg-sky-500',
    icon: MessageSquareText,
    defaults: { message: 'This is a bot message.' },
  },
  question: {
    title: 'Question',
    description: 'Ask and store an answer',
    help: 'Asks the user a question and saves the answer to a variable.',
    fieldHelp: {
      message: 'Question shown to the user.',
      variable: 'Variable name that receives the user answer.',
    },
    color: 'border-violet-400 bg-violet-50 text-violet-950',
    accent: 'bg-violet-500',
    icon: Bot,
    defaults: { message: 'Which plan do you want?', variable: 'plan' },
  },
  condition: {
    title: 'Condition',
    description: 'Branch by a condition',
    help: 'Chooses the next path by checking a variable against a condition.',
    fieldHelp: {
      variable: 'Variable to check, such as plan or query.',
      condition: 'Rule to evaluate, for example "equals premium".',
    },
    color: 'border-amber-400 bg-amber-50 text-amber-950',
    accent: 'bg-amber-500',
    icon: GitBranch,
    defaults: { variable: 'plan', condition: 'equals premium' },
  },
  action: {
    title: 'Action',
    description: 'Call API or process data',
    help: 'Records an action name and payload for backend or workflow side effects.',
    fieldHelp: {
      action: 'Action identifier, for example create_lead.',
      payload: 'JSON payload. Variables like {{query}} are supported.',
    },
    color: 'border-rose-400 bg-rose-50 text-rose-950',
    accent: 'bg-rose-500',
    icon: WandSparkles,
    defaults: { action: 'create_lead', payload: '{"source":"bot"}' },
  },
  rag_search: {
    title: 'RAG Search',
    description: 'Search internal knowledge',
    help: 'Searches your configured OpenAI vector store and saves matching chunks.',
    fieldHelp: {
      query: 'Search query. Variables like {{query}} are supported.',
      outputVariable: 'Variable that stores the search result object.',
      limit: 'Maximum number of results to return.',
    },
    color: 'border-cyan-400 bg-cyan-50 text-cyan-950',
    accent: 'bg-cyan-600',
    icon: Database,
    defaults: { query: '{{query}}', outputVariable: 'rag_results', limit: '3' },
  },
  web_search: {
    title: 'Web Search',
    description: 'Search current web sources',
    help: 'Searches the web provider and saves current source snippets.',
    fieldHelp: {
      query: 'Web search query. Variables like {{query}} are supported.',
      outputVariable: 'Variable that stores the web result object.',
      limit: 'Maximum number of results to return.',
    },
    color: 'border-blue-400 bg-blue-50 text-blue-950',
    accent: 'bg-blue-600',
    icon: Search,
    defaults: { query: '{{query}}', outputVariable: 'web_results', limit: '3' },
  },
  llm: {
    title: 'LLM',
    description: 'Generate with a backend model',
    help: 'Calls the backend LLM provider with your prompts and saves the generated answer.',
    fieldHelp: {
      model: 'Backend model name to use for this node.',
      systemPrompt: 'Instruction that controls the model behavior.',
      prompt: 'User prompt. Variables and prior node outputs are supported.',
      outputVariable: 'Variable that stores the model response.',
    },
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
    help: 'Final node. Returns the value as the workflow output.',
    fieldHelp: {
      value: 'Final output text or variable, for example {{llm_output}}.',
    },
    color: 'border-slate-400 bg-slate-100 text-slate-950',
    accent: 'bg-slate-700',
    icon: LogOut,
    defaults: { value: '{{llm_output}}' },
  },
};
