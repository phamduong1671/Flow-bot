import { BaseInput } from '../../../../components/base/BaseInput';
import { BaseTextarea } from '../../../../components/base/BaseTextarea';
import { NODE_TYPES } from '../../../../constants';
import type { NodeFieldChange, WorkflowNode } from '../../types';
import { NodeFormFields } from './NodeFormFields';

type QuestionNodeFormProps = {
  node: WorkflowNode;
  onChange: NodeFieldChange;
};

export function QuestionNodeForm({ node, onChange }: QuestionNodeFormProps) {
  const help = NODE_TYPES.question.fieldHelp;

  return (
    <NodeFormFields node={node} onChange={onChange}>
      <BaseTextarea
        label="Message"
        helpText={help.message}
        value={node.data.message || ''}
        onChange={(value) => onChange('message', value)}
        rows={3}
      />
      <BaseInput
        label="Variable"
        helpText={help.variable}
        value={node.data.variable || ''}
        onChange={(value) => onChange('variable', value)}
      />
    </NodeFormFields>
  );
}
