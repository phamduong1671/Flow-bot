import type { NodeFieldChange, WorkflowNode } from '../types';
import { ActionNodeForm } from './forms/ActionNodeForm';
import { ConditionNodeForm } from './forms/ConditionNodeForm';
import { MessageNodeForm } from './forms/MessageNodeForm';
import { QuestionNodeForm } from './forms/QuestionNodeForm';
import { StartNodeForm } from './forms/StartNodeForm';

type NodeConfigFormProps = {
  node: WorkflowNode;
  onChange: NodeFieldChange;
};

export function NodeConfigForm({ node, onChange }: NodeConfigFormProps) {
  if (node.type === 'start') return <StartNodeForm node={node} onChange={onChange} />;
  if (node.type === 'message') return <MessageNodeForm node={node} onChange={onChange} />;
  if (node.type === 'question') return <QuestionNodeForm node={node} onChange={onChange} />;
  if (node.type === 'condition') return <ConditionNodeForm node={node} onChange={onChange} />;
  if (node.type === 'action') return <ActionNodeForm node={node} onChange={onChange} />;

  return null;
}
