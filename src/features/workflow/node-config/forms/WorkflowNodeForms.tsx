import { BaseInput } from '../../../../components/base/BaseInput';
import { BaseTextarea } from '../../../../components/base/BaseTextarea';
import { NODE_TYPES } from '../../../../constants';
import type { NodeFieldChange, WorkflowNode } from '../../types';
import { NodeFormFields } from './NodeFormFields';

type Props = { node: WorkflowNode; onChange: NodeFieldChange };

export function InputNodeForm({ node, onChange }: Props) {
  const help = NODE_TYPES.input.fieldHelp;

  return (
    <NodeFormFields node={node} onChange={onChange}>
      <BaseInput
        label="Variable"
        helpText={help.variable}
        value={node.data.variable || ''}
        onChange={(value) => onChange('variable', value)}
      />
      <BaseInput
        label="Default value"
        helpText={help.defaultValue}
        value={node.data.defaultValue || ''}
        onChange={(value) => onChange('defaultValue', value)}
      />
    </NodeFormFields>
  );
}

export function SearchNodeForm({ node, onChange }: Props) {
  const help =
    node.type === 'rag_search' ? NODE_TYPES.rag_search.fieldHelp : NODE_TYPES.web_search.fieldHelp;

  return (
    <NodeFormFields node={node} onChange={onChange}>
      <BaseTextarea
        label="Query"
        helpText={help.query}
        value={node.data.query || ''}
        onChange={(value) => onChange('query', value)}
        rows={3}
      />
      <BaseInput
        label="Output variable"
        helpText={help.outputVariable}
        value={node.data.outputVariable || ''}
        onChange={(value) => onChange('outputVariable', value)}
      />
      <BaseInput
        label="Result limit"
        helpText={help.limit}
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
  const help = NODE_TYPES.llm.fieldHelp;

  return (
    <NodeFormFields node={node} onChange={onChange}>
      <BaseInput
        label="Model"
        helpText={help.model}
        value={node.data.model || ''}
        onChange={(value) => onChange('model', value)}
      />
      <BaseTextarea
        label="System prompt"
        helpText={help.systemPrompt}
        value={node.data.systemPrompt || ''}
        onChange={(value) => onChange('systemPrompt', value)}
        rows={3}
      />
      <BaseTextarea
        label="Prompt (supports {{variable}})"
        helpText={help.prompt}
        value={node.data.prompt || ''}
        onChange={(value) => onChange('prompt', value)}
        rows={7}
      />
      <BaseInput
        label="Output variable"
        helpText={help.outputVariable}
        value={node.data.outputVariable || ''}
        onChange={(value) => onChange('outputVariable', value)}
      />
    </NodeFormFields>
  );
}

export function OutputNodeForm({ node, onChange }: Props) {
  const help = NODE_TYPES.output.fieldHelp;

  return (
    <NodeFormFields node={node} onChange={onChange}>
      <BaseTextarea
        label="Output value"
        helpText={help.value}
        value={node.data.value || ''}
        onChange={(value) => onChange('value', value)}
        rows={5}
      />
    </NodeFormFields>
  );
}
