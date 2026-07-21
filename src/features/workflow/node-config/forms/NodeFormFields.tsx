import { BaseInput } from '../../../../components/base/BaseInput';
import { NODE_TYPES } from '../../../../constants';
import type { NodeFieldChange, WorkflowNode } from '../../types';

type NodeFormFieldsProps = {
  node: WorkflowNode;
  onChange: NodeFieldChange;
  children: React.ReactNode;
};

export function NodeFormFields({ node, onChange, children }: NodeFormFieldsProps) {
  const spec = NODE_TYPES[node.type];

  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <span className="mr-1 inline-grid h-4 w-4 place-items-center rounded-full border border-slate-300 bg-white text-[10px] font-bold text-slate-500">
          ?
        </span>
        {spec.help}
      </div>
      <BaseInput
        label="Label"
        helpText="Display name shown on the canvas. It does not change node behavior."
        value={node.label}
        onChange={(value) => onChange('label', value)}
      />
      {children}
    </div>
  );
}
