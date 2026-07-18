import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  MAX_ZOOM,
  MIN_ZOOM,
} from '../constants';
import { clamp, getNodesInBox, normalizeBox } from '../utils/flow';

export function centerCanvas(canvas) {
  requestAnimationFrame(() => {
    canvas.scrollLeft = CANVAS_WIDTH / 2 - canvas.clientWidth / 2;
    canvas.scrollTop = CANVAS_HEIGHT / 2 - canvas.clientHeight / 2;
  });
}

export function zoomCanvasFromWheel(event, { canvasRef, zoom, setZoom }) {
  const canvas = canvasRef.current;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const pointerX = clamp(event.clientX - rect.left, 0, rect.width);
  const pointerY = clamp(event.clientY - rect.top, 0, rect.height);
  const canvasX = (pointerX + canvas.scrollLeft) / zoom;
  const canvasY = (pointerY + canvas.scrollTop) / zoom;
  const nextZoom = clamp(zoom - event.deltaY * 0.0015, MIN_ZOOM, MAX_ZOOM);

  setZoom(nextZoom);
  requestAnimationFrame(() => {
    canvas.scrollLeft = canvasX * nextZoom - pointerX;
    canvas.scrollTop = canvasY * nextZoom - pointerY;
  });
}

export function createCanvasHandlers(args) {
  const { selection } = args;
  return {
    onDragOver: (event) => event.preventDefault(),
    onContextMenu: (event) => event.preventDefault(),
    onPointerDown: (event) => {
      selection.canvasActiveRef.current = true;
      if (event.button === 0) return startSelection(event, args);
      if (event.button === 2) return startPan(event, args);
    },
    onPointerEnter: () => {
      selection.canvasActiveRef.current = true;
    },
    onPointerLeave: () => {
      selection.canvasActiveRef.current = false;
    },
  };
}

function startPan(event, { canvasRef, panFrameRef, panPositionRef, setIsPanning }) {
  event.preventDefault();
  setIsPanning(true);
  const canvas = canvasRef.current;
  const startX = event.clientX;
  const startY = event.clientY;
  const startScrollLeft = canvas.scrollLeft;
  const startScrollTop = canvas.scrollTop;

  function onPointerMove(moveEvent) {
    panPositionRef.current = {
      left: startScrollLeft - (moveEvent.clientX - startX),
      top: startScrollTop - (moveEvent.clientY - startY),
    };
    if (panFrameRef.current) return;
    panFrameRef.current = requestAnimationFrame(() => {
      const nextPosition = panPositionRef.current;
      panFrameRef.current = null;
      if (!nextPosition) return;
      canvas.scrollLeft = nextPosition.left;
      canvas.scrollTop = nextPosition.top;
    });
  }

  function onPointerUp() {
    if (panFrameRef.current) cancelAnimationFrame(panFrameRef.current);
    panFrameRef.current = null;
    panPositionRef.current = null;
    setIsPanning(false);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  }

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
}

function startSelection(event, args) {
  const { nodes, selection, screenToCanvas, setSelectedIds, setSelectionBox, selectionMovedRef } = args;
  if (event.target.closest('[data-flow-node]') || event.target.closest('[data-port]')) return;

  event.preventDefault();
  const startPoint = screenToCanvas(event.clientX, event.clientY);
  selectionMovedRef.current = false;
  setSelectionBox({ x: startPoint.x, y: startPoint.y, width: 0, height: 0 });

  function onPointerMove(moveEvent) {
    const nextPoint = screenToCanvas(moveEvent.clientX, moveEvent.clientY);
    const nextBox = normalizeBox(startPoint, nextPoint);
    selectionMovedRef.current = nextBox.width > 6 || nextBox.height > 6;
    setSelectionBox(nextBox);
    setSelectedIds(getNodesInBox(nodes, nextBox));
  }

  function onPointerUp(upEvent) {
    const endPoint = screenToCanvas(upEvent.clientX, upEvent.clientY);
    const finalBox = normalizeBox(startPoint, endPoint);
    const nextSelectedIds = selectionMovedRef.current ? getNodesInBox(nodes, finalBox) : [];
    setSelectedIds(nextSelectedIds);
    selection.setSelectedEdgeId(null);
    selection.setRightPanelOpen(nextSelectedIds.length > 0);
    setSelectionBox(null);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  }

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
}
