import { BaseInput } from '../../../../components/base/BaseInput';
import { BaseTextarea } from '../../../../components/base/BaseTextarea';
import type { NodeFieldChange, WorkflowNode } from '../../types';
import { NodeFormFields } from './NodeFormFields';

type Props = { node: WorkflowNode; onChange: NodeFieldChange };

export function InputNodeForm({ node, onChange }: Props) {
  return (
    <NodeFormFields node={node} onChange={onChange}>
      <BaseInput
        label="Variable"
        value={node.data.variable || ''}
        onChange={(value) => onChange('variable', value)}
      />
      <BaseInput
        label="Default value"
        value={node.data.defaultValue || ''}
        onChange={(value) => onChange('defaultValue', value)}
      />
    </NodeFormFields>
  );
}

export function SearchNodeForm({ node, onChange }: Props) {
  return (
    <NodeFormFields node={node} onChange={onChange}>
      <BaseTextarea
        label="Query"
        value={node.data.query || ''}
        onChange={(value) => onChange('query', value)}
        rows={3}
      />
      <BaseInput
        label="Output variable"
        value={node.data.outputVariable || ''}
        onChange={(value) => onChange('outputVariable', value)}
      />
      <BaseInput
        label="Result limit"
        type="number"
        min={1}
        max={20}
        value={node.data.limit || '5'}
        onChange={(value) => onChange('limit', value)}
      />
    </NodeFormFields>
  );
}

export function LlmNodeForm({ node, onChange }: Props) {
  return (
    <NodeFormFields node={node} onChange={onChange}>
      <BaseInput
        label="Model"
        value={node.data.model || ''}
        onChange={(value) => onChange('model', value)}
      />
      <BaseTextarea
        label="System prompt"
        value={node.data.systemPrompt || ''}
        onChange={(value) => onChange('systemPrompt', value)}
        rows={3}
      />
      <BaseTextarea
        label="Prompt (supports {{variable}})"
        value={node.data.prompt || ''}
        onChange={(value) => onChange('prompt', value)}
        rows={7}
      />
      <BaseInput
        label="Output variable"
        value={node.data.outputVariable || ''}
        onChange={(value) => onChange('outputVariable', value)}
      />
    </NodeFormFields>
  );
}

export function OutputNodeForm({ node, onChange }: Props) {
  return (
    <NodeFormFields node={node} onChange={onChange}>
      <BaseTextarea
        label="Output value"
        value={node.data.value || ''}
        onChange={(value) => onChange('value', value)}
        rows={5}
      />
    </NodeFormFields>
  );
}
