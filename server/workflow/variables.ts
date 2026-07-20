export type WorkflowVariables = Record<string, unknown>;

export function getVariable(variables: WorkflowVariables, path: string): unknown {
  if (Object.prototype.hasOwnProperty.call(variables, path)) return variables[path];
  return path.split('.').reduce<unknown>((current, segment) => {
    if (current === null || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[segment];
  }, variables);
}

function stringifyTemplateValue(value: unknown) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function resolveTemplate(template: unknown, variables: WorkflowVariables) {
  return String(template ?? '').replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_match, path: string) =>
    stringifyTemplateValue(getVariable(variables, path)),
  );
}
