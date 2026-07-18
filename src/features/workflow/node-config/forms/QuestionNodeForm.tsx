import { BaseInput } from '../../../../components/base/BaseInput';
import { BaseTextarea } from '../../../../components/base/BaseTextarea';
import type { NodeFieldChange, WorkflowNode } from '../../types';
import { NodeFormFields } from './NodeFormFields';

type QuestionNodeFormProps = {
  node: WorkflowNode;
  onChange: NodeFieldChange;
};

export function QuestionNodeForm({ node, onChange }: QuestionNodeFormProps) {
  return (
    <NodeFormFields node={node} onChange={onChange}>
      <BaseTextarea
        label="Message"
        value={node.data.message || ''}
        onChange={(value) => onChange('message', value)}
        rows={3}
      />
      <BaseInput
        label="Variable"
        value={node.data.variable || ''}
        onChange={(value) => onChange('variable', value)}
      />
    </NodeFormFields>
  );
}
