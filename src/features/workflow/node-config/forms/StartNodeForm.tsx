import { BaseTextarea } from '../../../../components/base/BaseTextarea';
import { useLanguage } from '../../../../i18n';
import type { NodeFieldChange, WorkflowNode } from '../../types';
import { NodeFormFields } from './NodeFormFields';

type StartNodeFormProps = {
  node: WorkflowNode;
  onChange: NodeFieldChange;
};

export function StartNodeForm({ node, onChange }: StartNodeFormProps) {
  const { t } = useLanguage();

  return (
    <NodeFormFields node={node} onChange={onChange}>
      <BaseTextarea
        label={t('fieldMessage')}
        value={node.data.message || ''}
        onChange={(value) => onChange('message', value)}
        rows={3}
      />
    </NodeFormFields>
  );
}
