import { BaseInput } from '../../../../components/base/BaseInput';
import { BaseTextarea } from '../../../../components/base/BaseTextarea';
import { useLanguage } from '../../../../i18n';
import type { NodeFieldChange, WorkflowNode } from '../../types';
import { NodeFormFields } from './NodeFormFields';

type QuestionNodeFormProps = {
  node: WorkflowNode;
  onChange: NodeFieldChange;
};

export function QuestionNodeForm({ node, onChange }: QuestionNodeFormProps) {
  const { t } = useLanguage();

  return (
    <NodeFormFields node={node} onChange={onChange}>
      <BaseTextarea
        label={t('fieldMessage')}
        value={node.data.message || ''}
        onChange={(value) => onChange('message', value)}
        rows={3}
      />
      <BaseInput
        label={t('fieldVariable')}
        value={node.data.variable || ''}
        onChange={(value) => onChange('variable', value)}
      />
    </NodeFormFields>
  );
}
