import { useCallback, useEffect, useRef, useState } from 'react';

export function useFlowSelection({ nodes, edges, setNodes, setEdges }) {
  const canvasActiveRef = useRef(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  const selectedNode =
    selectedIds.length === 1 ? nodes.find((node) => node.id === selectedIds[0]) : null;
  const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId);
  const selectedCount = selectedIds.length;
  const hasSelection = selectedCount > 0 || Boolean(selectedEdge);

  const deleteSelectedNodes = useCallback(() => {
    if (selectedIds.length === 0) return;
    setNodes((current) => current.filter((node) => !selectedIds.includes(node.id)));
    setEdges((current) =>
      current.filter(
        (edge) => !selectedIds.includes(edge.source) && !selectedIds.includes(edge.target),
      ),
    );
    setSelectedIds([]);
    setSelectedEdgeId(null);
    setRightPanelOpen(false);
  }, [selectedIds, setEdges, setNodes]);

  const removeEdge = useCallback(
    (edgeId) => {
      setEdges((current) => current.filter((edge) => edge.id !== edgeId));
      if (selectedEdgeId === edgeId) {
        setSelectedEdgeId(null);
        setRightPanelOpen(false);
      }
    },
    [selectedEdgeId, setEdges],
  );

  function selectEdge(edgeId) {
    setSelectedIds([]);
    setSelectedEdgeId(edgeId);
    setRightPanelOpen(true);
  }

  useEffect(() => {
    function handleKeyDown(event) {
      const activeElement = document.activeElement as HTMLElement | null;
      const isTyping =
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.isContentEditable;

      if (isTyping) return;

      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === 'a' &&
        canvasActiveRef.current
      ) {
        event.preventDefault();
        setSelectedIds(nodes.map((node) => node.id));
        setSelectedEdgeId(null);
        setRightPanelOpen(nodes.length > 0);
        return;
      }

      if (selectedIds.length === 0 && !selectedEdgeId) return;

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        if (selectedEdgeId) removeEdge(selectedEdgeId);
        else deleteSelectedNodes();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelectedNodes, nodes, removeEdge, selectedEdgeId, selectedIds]);

  return {
    canvasActiveRef,
    selectedIds,
    setSelectedIds,
    selectedEdgeId,
    setSelectedEdgeId,
    selectedNode,
    selectedEdge,
    selectedCount,
    hasSelection,
    rightPanelOpen,
    setRightPanelOpen,
    deleteSelectedNodes,
    removeEdge,
    selectEdge,
  };
}
