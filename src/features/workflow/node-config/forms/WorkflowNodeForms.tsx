import { BaseInput } from '../../../../components/base/BaseInput';
import { BaseTextarea } from '../../../../components/base/BaseTextarea';
import { useLanguage } from '../../../../i18n';
import type { NodeFieldChange, WorkflowNode } from '../../types';
import { NodeFormFields } from './NodeFormFields';

type Props = { node: WorkflowNode; onChange: NodeFieldChange };

export function InputNodeForm({ node, onChange }: Props) {
  const { t } = useLanguage();

  return (
    <NodeFormFields node={node} onChange={onChange}>
      <BaseInput
        label={t('fieldVariable')}
        value={node.data.variable || ''}
        onChange={(value) => onChange('variable', value)}
      />
      <BaseInput
        label={t('fieldDefaultValue')}
        value={node.data.defaultValue || ''}
        onChange={(value) => onChange('defaultValue', value)}
      />
    </NodeFormFields>
  );
}

export function SearchNodeForm({ node, onChange }: Props) {
  const { t } = useLanguage();

  return (
    <NodeFormFields node={node} onChange={onChange}>
      <BaseTextarea
        label={t('fieldQuery')}
        value={node.data.query || ''}
        onChange={(value) => onChange('query', value)}
        rows={3}
      />
      <BaseInput
        label={t('fieldOutputVariable')}
        value={node.data.outputVariable || ''}
        onChange={(value) => onChange('outputVariable', value)}
      />
      <BaseInput
        label={t('fieldResultLimit')}
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
  const { t } = useLanguage();

  return (
    <NodeFormFields node={node} onChange={onChange}>
      <BaseInput
        label={t('fieldModel')}
        value={node.data.model || ''}
        onChange={(value) => onChange('model', value)}
      />
      <BaseTextarea
        label={t('fieldSystemPrompt')}
        value={node.data.systemPrompt || ''}
        onChange={(value) => onChange('systemPrompt', value)}
        rows={3}
      />
      <BaseTextarea
        label={t('fieldPrompt')}
        value={node.data.prompt || ''}
        onChange={(value) => onChange('prompt', value)}
        rows={7}
      />
      <BaseInput
        label={t('fieldOutputVariable')}
        value={node.data.outputVariable || ''}
        onChange={(value) => onChange('outputVariable', value)}
      />
    </NodeFormFields>
  );
}

export function OutputNodeForm({ node, onChange }: Props) {
  const { t } = useLanguage();

  return (
    <NodeFormFields node={node} onChange={onChange}>
      <BaseTextarea
        label={t('fieldOutputValue')}
        value={node.data.value || ''}
        onChange={(value) => onChange('value', value)}
        rows={5}
      />
    </NodeFormFields>
  );
}
