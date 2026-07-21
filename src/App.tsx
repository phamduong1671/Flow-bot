import { useMemo, useState } from 'react';
import { NODE_WIDTH } from './constants';
import { AuthModal } from './features/auth/AuthModal';
import { AppHeader } from './features/workflow/components/AppHeader';
import { FlowCanvas } from './features/workflow/components/FlowCanvas';
import { NodePalette } from './features/workflow/components/NodePalette';
import { RunnerPanel } from './features/workflow/components/RunnerPanel';
import { LlmMonitoring } from './features/workflow/components/LlmMonitoring';
import { SidePanel } from './features/workflow/components/SidePanel';
import { useCanvasInteractions } from './features/workflow/hooks/useCanvasInteractions';
import { useFlowSelection } from './features/workflow/hooks/useFlowSelection';
import { usePersistentFlow } from './features/workflow/hooks/usePersistentFlow';
import { useRunner } from './features/workflow/hooks/useRunner';
import { cloneSampleFlow } from './features/workflow/utils/flow';

function App() {
  const {
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
  } = usePersistentFlow();
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [jsonOutput, setJsonOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [language, setLanguage] = useState<'vi' | 'en'>('vi');

  const selection = useFlowSelection({ nodes, edges, setNodes, setEdges });
  const runner = useRunner(nodes, edges, { flowId: activeFlowId, beforeRemoteRun: saveNow });
  const canvas = useCanvasInteractions({
    nodes,
    setNodes,
    selectedIds: selection.selectedIds,
    setSelectedIds: selection.setSelectedIds,
    selection,
  });

  const edgeLines = useMemo(() => {
    return edges
      .map((edge) => {
        const source = nodes.find((node) => node.id === edge.source);
        const target = nodes.find((node) => node.id === edge.target);
        if (!source || !target) return null;

        return {
          ...edge,
          x1: source.position.x + NODE_WIDTH,
          y1: source.position.y + 52,
          x2: target.position.x,
          y2: target.position.y + 52,
        };
      })
      .filter(Boolean);
  }, [edges, nodes]);

  const jsonText = jsonOutput || JSON.stringify(botJson, null, 2);

  function handlePaletteDragStart(event, type) {
    event.dataTransfer.setData('application/flow-node', type);
    event.dataTransfer.effectAllowed = 'copy';
  }

  function useSampleFlow() {
    const sample = cloneSampleFlow();
    setNodes(sample.nodes);
    setEdges(sample.edges);
    setConnectingFrom(null);
    setJsonOutput('');
    setCopied(false);
    selection.setSelectedIds([]);
    selection.setSelectedEdgeId(null);
  }

  function updateSelectedNode(path, value) {
    setNodes((current) =>
      current.map((node) => {
        if (node.id !== selection.selectedNode?.id) return node;
        if (path === 'label') return { ...node, label: value };
        return { ...node, data: { ...node.data, [path]: value } };
      }),
    );
  }

  function updateSelectedEdge(path, value) {
    if (!selection.selectedEdgeId) return;
    setEdges((current) =>
      current.map((edge) =>
        edge.id === selection.selectedEdgeId ? { ...edge, [path]: value } : edge,
      ),
    );
  }

  function handleInputClick(targetId) {
    if (!connectingFrom || connectingFrom === targetId) return;
    const source = nodes.find((node) => node.id === connectingFrom);
    const target = nodes.find((node) => node.id === targetId);
    if (source?.type === 'output' || target?.type === 'start') {
      setConnectingFrom(null);
      return;
    }
    const edgeExists = edges.some(
      (edge) => edge.source === connectingFrom && edge.target === targetId,
    );

    if (!edgeExists) {
      setEdges((current) => [
        ...current,
        { id: `edge-${Date.now()}`, source: connectingFrom, target: targetId, label: 'next' },
      ]);
    }
    setConnectingFrom(null);
  }

  function buildJson() {
    setJsonOutput(JSON.stringify(botJson, null, 2));
    setCopied(false);
    selection.setRightPanelOpen(true);
  }

  async function copyJson() {
    await navigator.clipboard.writeText(jsonText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function downloadJson() {
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'bot-flow.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="h-screen overflow-hidden bg-[#eef2f7] text-slate-900">
      <section className="relative h-full min-h-0 overflow-hidden">
        <NodePalette
          open={paletteOpen}
          onToggle={() => setPaletteOpen((open) => !open)}
          onDragStart={handlePaletteDragStart}
          showSampleAction={nodes.length === 0 && edges.length === 0}
          onUseSampleFlow={useSampleFlow}
        />

        <div className="flex h-full min-h-0 flex-col">
          <AppHeader
            onRun={runner.start}
            onBuildJson={buildJson}
            onOpenAuth={() => setAuthOpen(true)}
            saveStatus={saveStatus}
            flows={flows}
            activeFlowId={activeFlowId}
            flowName={flowName}
            onFlowNameChange={setFlowName}
            onSelectFlow={selectFlow}
            onCreateFlow={createNewFlow}
            onDeleteFlow={deleteActiveFlow}
            language={language}
            onToggleLanguage={() => setLanguage((current) => (current === 'vi' ? 'en' : 'vi'))}
          />
          <FlowCanvas
            canvas={canvas}
            nodes={nodes}
            edgeLines={edgeLines}
            selectedIds={selection.selectedIds}
            selectedEdgeId={selection.selectedEdgeId}
            connectingFrom={connectingFrom}
            onSelectEdge={selection.selectEdge}
            onMoveNode={canvas.moveNode}
            onSelectNode={(nodeId) => {
              selection.setSelectedIds([nodeId]);
              selection.setSelectedEdgeId(null);
              selection.setRightPanelOpen(true);
            }}
            onInputClick={handleInputClick}
            onOutputClick={(nodeId) => setConnectingFrom(connectingFrom === nodeId ? null : nodeId)}
            runner={
              <RunnerPanel
                runner={runner.runner}
                onRestart={runner.start}
                onClose={runner.close}
                onOpenMonitoring={runner.openMonitoring}
                rightPanelOpen={selection.rightPanelOpen}
                input={runner.runner.input}
                onInputChange={runner.setInput}
                onSubmit={runner.submit}
              />
            }
          />
        </div>

        <LlmMonitoring
          open={runner.runner.monitoringOpen}
          trace={runner.runner.trace}
          onClose={runner.closeMonitoring}
        />

        <SidePanel
          open={selection.rightPanelOpen}
          onToggle={() => selection.setRightPanelOpen((open) => !open)}
          selectedCount={selection.selectedCount}
          selectedNode={selection.selectedNode}
          selectedEdge={selection.selectedEdge}
          hasSelection={selection.hasSelection}
          edges={edges}
          nodes={nodes}
          selectedEdgeId={selection.selectedEdgeId}
          onDeleteNodes={selection.deleteSelectedNodes}
          onUpdateNode={updateSelectedNode}
          onSelectEdge={selection.selectEdge}
          onUpdateEdge={updateSelectedEdge}
          onRemoveEdge={selection.removeEdge}
          copied={copied}
          onCopyJson={copyJson}
          onDownloadJson={downloadJson}
          jsonText={jsonText}
        />
        {authOpen && <AuthModal open onClose={() => setAuthOpen(false)} />}
      </section>
    </main>
  );
}

export default App;
