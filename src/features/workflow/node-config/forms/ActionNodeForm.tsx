import { BaseInput } from '../../../../components/base/BaseInput';
import { BaseTextarea } from '../../../../components/base/BaseTextarea';
import { NODE_TYPES } from '../../../../constants';
import type { NodeFieldChange, WorkflowNode } from '../../types';
import { NodeFormFields } from './NodeFormFields';

type ActionNodeFormProps = {
  node: WorkflowNode;
  onChange: NodeFieldChange;
};

export function ActionNodeForm({ node, onChange }: ActionNodeFormProps) {
  const help = NODE_TYPES.action.fieldHelp;

  return (
    <NodeFormFields node={node} onChange={onChange}>
      <BaseInput
        label="Action"
        helpText={help.action}
        value={node.data.action || ''}
        onChange={(value) => onChange('action', value)}
      />
      <BaseTextarea
        label="Payload"
        helpText={help.payload}
        value={node.data.payload || ''}
        onChange={(value) => onChange('payload', value)}
        rows={4}
      />
    </NodeFormFields>
  );
}
