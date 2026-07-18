import { Bot, GitBranch, MessageSquareText, Play, WandSparkles } from 'lucide-react';

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
};
