import { MAX_RUN_STEPS } from '../constants';

export function createRunnerMessage(role, text) {
  return {
    id: `runner-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    role,
    text,
  };
}

export function getOutgoingEdges(edges) {
  return edges.reduce((map, edge) => {
    map[edge.source] = map[edge.source] || [];
    map[edge.source].push(edge);
    return map;
  }, {});
}

export function pickNextEdge(edges) {
  return edges.find((edge) => edge.label?.toLowerCase() === 'next') || edges[0];
}

export function pickConditionEdge(edges, result) {
  const preferredLabel = result ? 'true' : 'false';
  const fallbackIndex = result ? 0 : 1;

  return (
    edges.find((edge) => edge.label?.toLowerCase() === preferredLabel) ||
    edges[fallbackIndex] ||
    edges[0]
  );
}

export function evaluateCondition(data, variables) {
  const variableValue = String(variables[data.variable] ?? '').trim().toLowerCase();
  const condition = String(data.condition || '').trim().toLowerCase();

  if (!condition) return Boolean(variableValue);
  if (condition.startsWith('equals ')) return variableValue === condition.replace('equals ', '').trim();
  if (condition.startsWith('not equals ')) return variableValue !== condition.replace('not equals ', '').trim();
  if (condition.startsWith('contains ')) return variableValue.includes(condition.replace('contains ', '').trim());
  return variableValue === condition;
}

export function resolveTemplate(value, variables) {
  return String(value).replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key) => variables[key] ?? '');
}

export function executeFlowUntilPause({ startNodeId, nodes, edges, context }) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const outgoing = getOutgoingEdges(edges);
  const nextContext = { variables: { ...context.variables }, actions: [...context.actions] };
  const messages = [];
  let currentNodeId = startNodeId;

  for (let step = 0; step < MAX_RUN_STEPS; step += 1) {
    if (!currentNodeId) return { status: 'ended', context: nextContext, messages, text: 'Flow finished.' };

    const node = nodeMap.get(currentNodeId);
    if (!node) return { status: 'error', context: nextContext, messages, text: `Node not found: ${currentNodeId}` };

    const nodeEdges = outgoing[node.id] || [];
    if (node.type === 'start' || node.type === 'message') {
      if (node.data.message) messages.push(createRunnerMessage('bot', resolveTemplate(node.data.message, nextContext.variables)));
      currentNodeId = pickNextEdge(nodeEdges)?.target;
    } else if (node.type === 'question') {
      messages.push(createRunnerMessage('bot', resolveTemplate(node.data.message || 'Please enter a value.', nextContext.variables)));
      return { status: 'waiting', context: nextContext, messages, waitingNodeId: node.id };
    } else if (node.type === 'condition') {
      const result = evaluateCondition(node.data, nextContext.variables);
      messages.push(createRunnerMessage('system', `Condition ${node.data.variable || 'value'} ${node.data.condition || ''}: ${result ? 'true' : 'false'}`));
      currentNodeId = pickConditionEdge(nodeEdges, result)?.target;
    } else if (node.type === 'action') {
      const payload = resolveTemplate(node.data.payload || '{}', nextContext.variables);
      nextContext.actions.push({ action: node.data.action, payload });
      messages.push(createRunnerMessage('system', `Action: ${node.data.action || 'unnamed'} ${payload}`));
      currentNodeId = pickNextEdge(nodeEdges)?.target;
    } else {
      return { status: 'error', context: nextContext, messages, text: `Unsupported node type: ${node.type}` };
    }
  }

  return { status: 'error', context: nextContext, messages, text: 'Flow stopped because it exceeded the maximum run steps.' };
}
