import { useEffect, useMemo, useRef, useState } from 'react';
import { NODE_TYPES, NODE_WIDTH } from '../constants';
import { centerCanvas, createCanvasHandlers, zoomCanvasFromWheel } from './canvasEventHandlers';
import { clampNodePosition, createNode, getCanvasSize } from '../utils/flow';

export function useCanvasInteractions({ nodes, setNodes, selectedIds, setSelectedIds, selection }) {
  const canvasRef = useRef(null);
  const nodeDragFrameRef = useRef(null);
  const nodeDragPositionRef = useRef(null);
  const suppressNodeClickRef = useRef(false);
  const selectionMovedRef = useRef(false);
  const panFrameRef = useRef(null);
  const panPositionRef = useRef(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isNodeDragging, setIsNodeDragging] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [selectionBox, setSelectionBox] = useState(null);
  const canvasSize = useMemo(() => getCanvasSize(nodes), [nodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    centerCanvas(canvas);
  }, []);

  useEffect(() => {
    function handleNativeWheel(event) {
      if (!event.ctrlKey) return;
      event.preventDefault();
      zoomCanvasFromWheel(event, { canvasRef, zoom, setZoom });
    }

    window.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleNativeWheel);
  }, [zoom]);

  function screenToCanvas(clientX, clientY) {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left + canvasRef.current.scrollLeft) / zoom,
      y: (clientY - rect.top + canvasRef.current.scrollTop) / zoom,
    };
  }

  function handleDrop(event) {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/flow-node');
    if (!type || !NODE_TYPES[type]) return;

    const point = screenToCanvas(event.clientX, event.clientY);
    const nextPosition = clampNodePosition({ x: point.x - NODE_WIDTH / 2, y: point.y - 48 });
    const newNode = createNode(type, nextPosition.x, nextPosition.y);
    setNodes((current) => [...current, newNode]);
    setSelectedIds([newNode.id]);
    selection.setSelectedEdgeId(null);
    selection.setRightPanelOpen(true);
  }

  function moveNode(nodeId, pointerEvent) {
    if (pointerEvent.button !== 0) return;
    const draggingIds = selectedIds.includes(nodeId) ? selectedIds : [nodeId];
    const startNodes = nodes
      .filter((node) => draggingIds.includes(node.id))
      .map((node) => ({ id: node.id, position: node.position }));
    if (startNodes.length === 0) return;

    pointerEvent.preventDefault();
    const startPoint = screenToCanvas(pointerEvent.clientX, pointerEvent.clientY);
    suppressNodeClickRef.current = false;
    pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
    setSelectedIds(draggingIds);
    selection.setSelectedEdgeId(null);
    selection.setRightPanelOpen(true);
    setIsNodeDragging(true);

    function onPointerMove(event) {
      const nextPoint = screenToCanvas(event.clientX, event.clientY);
      const requestedDeltaX = nextPoint.x - startPoint.x;
      const requestedDeltaY = nextPoint.y - startPoint.y;
      const minX = Math.min(...startNodes.map((node) => node.position.x));
      const minY = Math.min(...startNodes.map((node) => node.position.y));
      const deltaX = Math.max(requestedDeltaX, -minX);
      const deltaY = Math.max(requestedDeltaY, -minY);

      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) suppressNodeClickRef.current = true;
      nodeDragPositionRef.current = startNodes.map((node) => ({
        id: node.id,
        position: { x: node.position.x + deltaX, y: node.position.y + deltaY },
      }));

      if (nodeDragFrameRef.current) return;
      nodeDragFrameRef.current = requestAnimationFrame(() => flushNodeDrag());
    }

    function onPointerUp() {
      if (nodeDragFrameRef.current) cancelAnimationFrame(nodeDragFrameRef.current);
      flushNodeDrag();
      nodeDragPositionRef.current = null;
      nodeDragFrameRef.current = null;
      setIsNodeDragging(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.setTimeout(() => {
        suppressNodeClickRef.current = false;
      }, 0);
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }

  function flushNodeDrag() {
    const nextPositions = nodeDragPositionRef.current;
    nodeDragFrameRef.current = null;
    if (!nextPositions) return;
    setNodes((current) =>
      current.map((node) => {
        const nextNode = nextPositions.find((item) => item.id === node.id);
        return nextNode ? { ...node, position: nextNode.position } : node;
      }),
    );
  }

  return {
    canvasRef,
    canvasSize,
    zoom,
    selectionBox,
    isPanning,
    isNodeDragging,
    suppressNodeClickRef,
    handleDrop,
    moveNode,
    canvasHandlers: createCanvasHandlers({
      canvasRef,
      zoom,
      setZoom,
      nodes,
      setSelectedIds,
      selection,
      screenToCanvas,
      setSelectionBox,
      selectionMovedRef,
      panFrameRef,
      panPositionRef,
      setIsPanning,
    }),
  };
}
