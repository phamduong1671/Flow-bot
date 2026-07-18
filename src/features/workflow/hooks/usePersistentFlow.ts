import { useEffect, useMemo, useState } from 'react';
import { FLOW_STORAGE_KEY } from '../../../constants';
import { buildScenario, loadSavedFlow } from '../utils/flow';

export function usePersistentFlow() {
  const savedFlow = useMemo(() => loadSavedFlow(), []);
  const [nodes, setNodes] = useState(savedFlow.nodes);
  const [edges, setEdges] = useState(savedFlow.edges);

  useEffect(() => {
    window.localStorage.setItem(FLOW_STORAGE_KEY, JSON.stringify({ nodes, edges }));
  }, [nodes, edges]);

  const botJson = useMemo(() => buildScenario(nodes, edges), [nodes, edges]);

  return { nodes, setNodes, edges, setEdges, botJson };
}
