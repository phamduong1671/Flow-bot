import React, { useMemo, useState } from 'react';
import { NODE_WIDTH } from './constants';
import { AppHeader } from './components/AppHeader';
import { FlowCanvas } from './components/FlowCanvas';
import { NodePalette } from './components/NodePalette';
import { RunnerPanel } from './components/RunnerPanel';
import { SidePanel } from './components/SidePanel';
import { useCanvasInteractions } from './hooks/useCanvasInteractions';
import { useFlowSelection } from './hooks/useFlowSelection';
import { usePersistentFlow } from './hooks/usePersistentFlow';
import { useRunner } from './hooks/useRunner';

function App() {
  const { nodes, setNodes, edges, setEdges, botJson } = usePersistentFlow();
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [jsonOutput, setJsonOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(true);

  const selection = useFlowSelection({ nodes, edges, setNodes, setEdges });
  const runner = useRunner(nodes, edges);
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
    const edgeExists = edges.some((edge) => edge.source === connectingFrom && edge.target === targetId);

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
        />

        <div className="flex h-full min-h-0 flex-col">
          <AppHeader onRun={runner.start} onBuildJson={buildJson} />
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
                input={runner.runner.input}
                onInputChange={runner.setInput}
                onSubmit={runner.submit}
              />
            }
          />
        </div>

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
      </section>
    </main>
  );
}

export default App;
