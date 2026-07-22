import { BaseInput } from '../../../../components/base/BaseInput';
import { useLanguage } from '../../../../i18n';
import type { NodeFieldChange, WorkflowNode } from '../../types';
import { NodeFormFields } from './NodeFormFields';

type ConditionNodeFormProps = {
  node: WorkflowNode;
  onChange: NodeFieldChange;
};

export function ConditionNodeForm({ node, onChange }: ConditionNodeFormProps) {
  const { t } = useLanguage();

  return (
    <NodeFormFields node={node} onChange={onChange}>
      <BaseInput
        label={t('fieldVariable')}
        value={node.data.variable || ''}
        onChange={(value) => onChange('variable', value)}
      />
      <BaseInput
        label={t('fieldCondition')}
        value={node.data.condition || ''}
        onChange={(value) => onChange('condition', value)}
        placeholder="equals premium"
      />
    </NodeFormFields>
  );
}
