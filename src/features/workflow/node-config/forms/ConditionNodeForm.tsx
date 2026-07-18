import { BaseInput } from '../../../../components/base/BaseInput';
import type { NodeFieldChange, WorkflowNode } from '../../types';
import { NodeFormFields } from './NodeFormFields';

type ConditionNodeFormProps = {
  node: WorkflowNode;
  onChange: NodeFieldChange;
};

export function ConditionNodeForm({ node, onChange }: ConditionNodeFormProps) {
  return (
    <NodeFormFields node={node} onChange={onChange}>
      <BaseInput
        label="Variable"
        value={node.data.variable || ''}
        onChange={(value) => onChange('variable', value)}
      />
      <BaseInput
        label="Condition"
        value={node.data.condition || ''}
        onChange={(value) => onChange('condition', value)}
        placeholder="equals premium"
      />
    </NodeFormFields>
  );
}
