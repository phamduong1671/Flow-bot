import { BaseTextarea } from '../../../../components/base/BaseTextarea';
import type { NodeFieldChange, WorkflowNode } from '../../types';
import { NodeFormFields } from './NodeFormFields';

type StartNodeFormProps = {
  node: WorkflowNode;
  onChange: NodeFieldChange;
};

export function StartNodeForm({ node, onChange }: StartNodeFormProps) {
  return (
    <NodeFormFields node={node} onChange={onChange}>
      <BaseTextarea
        label="Message"
        value={node.data.message || ''}
        onChange={(value) => onChange('message', value)}
        rows={3}
      />
    </NodeFormFields>
  );
}
