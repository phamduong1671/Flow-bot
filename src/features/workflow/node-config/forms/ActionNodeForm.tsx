import { BaseInput } from '../../../../components/base/BaseInput';
import { BaseTextarea } from '../../../../components/base/BaseTextarea';
import { useLanguage } from '../../../../i18n';
import type { NodeFieldChange, WorkflowNode } from '../../types';
import { NodeFormFields } from './NodeFormFields';

type ActionNodeFormProps = {
  node: WorkflowNode;
  onChange: NodeFieldChange;
};

export function ActionNodeForm({ node, onChange }: ActionNodeFormProps) {
  const { t } = useLanguage();

  return (
    <NodeFormFields node={node} onChange={onChange}>
      <BaseInput
        label={t('fieldAction')}
        value={node.data.action || ''}
        onChange={(value) => onChange('action', value)}
      />
      <BaseTextarea
        label={t('fieldPayload')}
        value={node.data.payload || ''}
        onChange={(value) => onChange('payload', value)}
        rows={4}
      />
    </NodeFormFields>
  );
}
