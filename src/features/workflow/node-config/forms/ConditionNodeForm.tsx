import { BaseInput } from '../../../../components/base/BaseInput';
import { NODE_TYPES } from '../../../../constants';
import type { NodeFieldChange, WorkflowNode } from '../../types';
import { NodeFormFields } from './NodeFormFields';

type ConditionNodeFormProps = {
  node: WorkflowNode;
  onChange: NodeFieldChange;
};

export function ConditionNodeForm({ node, onChange }: ConditionNodeFormProps) {
  const help = NODE_TYPES.condition.fieldHelp;

  return (
    <NodeFormFields node={node} onChange={onChange}>
      <BaseInput
        label="Variable"
        helpText={help.variable}
        value={node.data.variable || ''}
        onChange={(value) => onChange('variable', value)}
      />
      <BaseInput
        label="Condition"
        helpText={help.condition}
        value={node.data.condition || ''}
        onChange={(value) => onChange('condition', value)}
        placeholder="equals premium"
      />
    </NodeFormFields>
  );
}
