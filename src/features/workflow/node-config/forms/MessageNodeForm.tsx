import { BaseTextarea } from '../../../../components/base/BaseTextarea';
import { NODE_TYPES } from '../../../../constants';
import type { NodeFieldChange, WorkflowNode } from '../../types';
import { NodeFormFields } from './NodeFormFields';

type MessageNodeFormProps = {
  node: WorkflowNode;
  onChange: NodeFieldChange;
};

export function MessageNodeForm({ node, onChange }: MessageNodeFormProps) {
  const help = NODE_TYPES.message.fieldHelp;

  return (
    <NodeFormFields node={node} onChange={onChange}>
      <BaseTextarea
        label="Message"
        helpText={help.message}
        value={node.data.message || ''}
        onChange={(value) => onChange('message', value)}
        rows={3}
      />
    </NodeFormFields>
  );
}
