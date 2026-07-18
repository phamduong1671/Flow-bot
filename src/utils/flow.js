import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  FLOW_STORAGE_KEY,
  NODE_HEIGHT,
  NODE_TYPES,
  NODE_WIDTH,
} from '../constants';

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function createNode(type, x, y) {
  const spec = NODE_TYPES[type];
  const id = `${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  return {
    id,
    type,
    label: spec.title,
    position: { x, y },
    data: { ...spec.defaults },
  };
}

export function clampNodePosition(position) {
  return {
    x: clamp(position.x, 0, CANVAS_WIDTH - NODE_WIDTH),
    y: clamp(position.y, 0, CANVAS_HEIGHT - NODE_HEIGHT),
  };
}

export const initialNodes = [
  createNode('start', CANVAS_WIDTH / 2 - NODE_WIDTH / 2, CANVAS_HEIGHT / 2 - NODE_HEIGHT / 2),
];

export const initialEdges = [];

export function loadSavedFlow() {
  try {
    const savedFlow = window.localStorage.getItem(FLOW_STORAGE_KEY);
    if (!savedFlow) return { nodes: initialNodes, edges: initialEdges };

    const parsedFlow = JSON.parse(savedFlow);
    if (!Array.isArray(parsedFlow.nodes) || !Array.isArray(parsedFlow.edges)) {
      return { nodes: initialNodes, edges: initialEdges };
    }

    return { nodes: parsedFlow.nodes, edges: parsedFlow.edges };
  } catch {
    return { nodes: initialNodes, edges: initialEdges };
  }
}

export function normalizeBox(start, end) {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

export function getNodesInBox(nodes, box) {
  if (box.width < 6 && box.height < 6) return [];

  return nodes
    .filter((node) => {
      const nodeRight = node.position.x + NODE_WIDTH;
      const nodeBottom = node.position.y + NODE_HEIGHT;
      const boxRight = box.x + box.width;
      const boxBottom = box.y + box.height;

      return (
        node.position.x >= box.x &&
        nodeRight <= boxRight &&
        node.position.y >= box.y &&
        nodeBottom <= boxBottom
      );
    })
    .map((node) => node.id);
}

export function buildScenario(nodes, edges) {
  const outgoing = edges.reduce((map, edge) => {
    map[edge.source] = map[edge.source] || [];
    map[edge.source].push({ target: edge.target, label: edge.label });
    return map;
  }, {});

  return {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.type,
      label: node.label,
      position: node.position,
      data: node.data,
      next: outgoing[node.id] || [],
    })),
    edges,
  };
}
