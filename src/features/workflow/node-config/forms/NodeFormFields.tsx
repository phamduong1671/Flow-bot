import { BaseInput } from '../../../../components/base/BaseInput';
import { NODE_TYPES } from '../../../../constants';
import { useLanguage } from '../../../../i18n';
import type { NodeFieldChange, WorkflowNode } from '../../types';

type NodeFormFieldsProps = {
  node: WorkflowNode;
  onChange: NodeFieldChange;
  children: React.ReactNode;
};

export function NodeFormFields({ node, onChange, children }: NodeFormFieldsProps) {
  const { t, nodeText } = useLanguage();
  const spec = nodeText(node.type as keyof typeof NODE_TYPES);

  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        {spec.help}
      </div>
      <BaseInput
        label={t('fieldLabel')}
        value={node.label}
        onChange={(value) => onChange('label', value)}
      />
      {children}
    </div>
  );
}
