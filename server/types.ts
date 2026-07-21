export type FlowNode = {
  id: string;
  type:
    | 'start'
    | 'input'
    | 'message'
    | 'question'
    | 'condition'
    | 'action'
    | 'rag_search'
    | 'web_search'
    | 'llm'
    | 'output';
  label: string;
  position: { x: number; y: number };
  data: Record<string, string>;
};

export type FlowEdge = { id: string; source: string; target: string; label?: string };
export type Flow = { nodes: FlowNode[]; edges: FlowEdge[] };

export type FlowRecord = Flow & {
  id: string;
  ownerId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type UserRecord = {
  id: string;
  email: string;
  name?: string;
  passwordHash?: string;
  googleSubject?: string;
  createdAt: string;
};
