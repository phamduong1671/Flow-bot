import { BaseInput } from '../../../../components/base/BaseInput';
import type { NodeFieldChange, WorkflowNode } from '../../types';

type NodeFormFieldsProps = {
  node: WorkflowNode;
  onChange: NodeFieldChange;
  children: React.ReactNode;
};

export function NodeFormFields({ node, onChange, children }: NodeFormFieldsProps) {
  return (
    <div className="mt-4 space-y-3">
      <BaseInput label="Label" value={node.label} onChange={(value) => onChange('label', value)} />
      {children}
    </div>
  );
}
