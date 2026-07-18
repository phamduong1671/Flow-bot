export type NodeType = 'start' | 'message' | 'question' | 'condition' | 'action';

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
