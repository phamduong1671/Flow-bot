import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FLOW_STORAGE_KEY } from '../../../constants';
import { apiRequest } from '../../auth/api';
import { useAuth } from '../../auth/AuthContext';
import { buildScenario, cloneSampleFlow, loadSavedFlow } from '../utils/flow';
import type { WorkflowEdge, WorkflowNode } from '../types';

type FlowRecord = {
  id: string;
  ownerId: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt: string;
  updatedAt: string;
};

export function usePersistentFlow() {
  const { token, user } = useAuth();
  const savedFlow = useMemo(() => loadSavedFlow(), []);
  const [nodes, setNodes] = useState(savedFlow.nodes);
  const [edges, setEdges] = useState(savedFlow.edges);
  const [flows, setFlows] = useState<FlowRecord[]>([]);
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);
  const [flowName, setFlowName] = useState('Sample research flow');
  const [readyUserId, setReadyUserId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'local' | 'loading' | 'saving' | 'saved' | 'error'>(
    'local',
  );
  const editorRef = useRef({ nodes, edges });
  editorRef.current = { nodes, edges };

  function loadFlow(flow: FlowRecord) {
    setNodes(flow.nodes);
    setEdges(flow.edges);
    setFlowName(flow.name);
    setActiveFlowId(flow.id);
  }

  useEffect(() => {
    window.localStorage.setItem(FLOW_STORAGE_KEY, JSON.stringify({ nodes, edges }));
  }, [nodes, edges]);

  useEffect(() => {
    let active = true;
    if (!token || !user) {
      queueMicrotask(() => {
        if (active) {
          setFlows([]);
          setActiveFlowId(null);
          setReadyUserId(null);
          setSaveStatus('local');
        }
      });
      return;
    }
    queueMicrotask(() => active && setSaveStatus('loading'));
    apiRequest('/api/flows', {}, token)
      .then(async ({ flows: remoteFlows }: { flows: FlowRecord[] }) => {
        if (!active) return;
        let nextFlows = remoteFlows;
        if (!nextFlows.length) {
          const local = editorRef.current;
          const created = (await apiRequest(
            '/api/flows',
            {
              method: 'POST',
              body: JSON.stringify({ name: 'My flow', nodes: local.nodes, edges: local.edges }),
            },
            token,
          )) as { flow: FlowRecord };
          nextFlows = [created.flow];
        }
        if (!active) return;
        setFlows(nextFlows);
        loadFlow(nextFlows[0]);
        setReadyUserId(user.id);
        setSaveStatus('saved');
      })
      .catch(() => active && setSaveStatus('error'));
    return () => {
      active = false;
    };
  }, [token, user]);

  const saveNow = useCallback(async () => {
    if (!token || !user || readyUserId !== user.id || !activeFlowId) return;
    setSaveStatus('saving');
    try {
      const { flow } = (await apiRequest(
        `/api/flows/${activeFlowId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ name: flowName, nodes, edges }),
        },
        token,
      )) as { flow: FlowRecord };
      setFlows((current) => current.map((item) => (item.id === flow.id ? flow : item)));
      setSaveStatus('saved');
    } catch (error) {
      setSaveStatus('error');
      throw error;
    }
  }, [activeFlowId, edges, flowName, nodes, readyUserId, token, user]);

  useEffect(() => {
    if (!token || !user || readyUserId !== user.id || !activeFlowId) return;
    const timeout = window.setTimeout(() => {
      void saveNow().catch(() => undefined);
    }, 600);
    return () => window.clearTimeout(timeout);
  }, [activeFlowId, readyUserId, saveNow, token, user]);

  function selectFlow(flowId: string) {
    const flow = flows.find((candidate) => candidate.id === flowId);
    if (flow) loadFlow(flow);
  }

  async function createNewFlow() {
    if (!token) return;
    const sample = cloneSampleFlow();
    setSaveStatus('saving');
    try {
      const { flow } = (await apiRequest(
        '/api/flows',
        {
          method: 'POST',
          body: JSON.stringify({ name: 'New workflow', ...sample }),
        },
        token,
      )) as { flow: FlowRecord };
      setFlows((current) => [flow, ...current]);
      loadFlow(flow);
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  }

  async function deleteActiveFlow() {
    if (!token || !activeFlowId || !window.confirm('Delete this flow permanently?')) return;
    setSaveStatus('saving');
    try {
      await apiRequest(`/api/flows/${activeFlowId}`, { method: 'DELETE' }, token);
      const remaining = flows.filter((flow) => flow.id !== activeFlowId);
      if (remaining.length) {
        setFlows(remaining);
        loadFlow(remaining[0]);
      } else {
        setFlows([]);
        setActiveFlowId(null);
        await createNewFlow();
      }
    } catch {
      setSaveStatus('error');
    }
  }

  const botJson = useMemo(() => buildScenario(nodes, edges), [nodes, edges]);

  return {
    nodes,
    setNodes,
    edges,
    setEdges,
    botJson,
    saveStatus,
    saveNow,
    flows,
    activeFlowId,
    flowName,
    setFlowName,
    selectFlow,
    createNewFlow,
    deleteActiveFlow,
  };
}
