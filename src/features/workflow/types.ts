export type NodeType =
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

export type WorkflowNode = {
  id: string;
  type: NodeType;
  label: string;
  position: {
    x: number;
    y: number;
  };
  data: Record<string, string>;
};

export type WorkflowEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

export type NodeFieldChange = (path: string, value: string) => void;
