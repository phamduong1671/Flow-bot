import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  Braces,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  GitBranch,
  Hand,
  MessageSquareText,
  MousePointer2,
  Play,
  Plus,
  RotateCcw,
  Route,
  Trash2,
  WandSparkles,
  X,
} from 'lucide-react';

const CANVAS_WIDTH = 4200;
const CANVAS_HEIGHT = 2800;
const NODE_WIDTH = 224;
const NODE_HEIGHT = 112;
const HEADER_HEIGHT = 76;
const MIN_ZOOM = 0.45;
const MAX_ZOOM = 1.8;
const MAX_RUN_STEPS = 80;
const FLOW_STORAGE_KEY = 'flow-bot-builder-state';

const NODE_TYPES = {
  start: {
    title: 'Start',
    description: 'Conversation entry point',
    color: 'border-emerald-400 bg-emerald-50 text-emerald-900',
    accent: 'bg-emerald-500',
    icon: Play,
    defaults: { message: 'Hello! How can I help you?' },
  },
  message: {
    title: 'Message',
    description: 'Bot sends a message',
    color: 'border-sky-400 bg-sky-50 text-sky-950',
    accent: 'bg-sky-500',
    icon: MessageSquareText,
    defaults: { message: 'This is a bot message.' },
  },
  question: {
    title: 'Question',
    description: 'Ask and store an answer',
    color: 'border-violet-400 bg-violet-50 text-violet-950',
    accent: 'bg-violet-500',
    icon: Bot,
    defaults: { message: 'Which plan do you want?', variable: 'plan' },
  },
  condition: {
    title: 'Condition',
    description: 'Branch by a condition',
    color: 'border-amber-400 bg-amber-50 text-amber-950',
    accent: 'bg-amber-500',
    icon: GitBranch,
    defaults: { variable: 'plan', condition: 'equals premium' },
  },
  action: {
    title: 'Action',
    description: 'Call API or process data',
    color: 'border-rose-400 bg-rose-50 text-rose-950',
    accent: 'bg-rose-500',
    icon: WandSparkles,
    defaults: { action: 'create_lead', payload: '{"source":"bot"}' },
  },
};

const initialNodes = [
  createNode('start', CANVAS_WIDTH / 2 - NODE_WIDTH / 2, CANVAS_HEIGHT / 2 - NODE_HEIGHT / 2),
];

const initialEdges = [];

function loadSavedFlow() {
  try {
    const savedFlow = window.localStorage.getItem(FLOW_STORAGE_KEY);
    if (!savedFlow) return { nodes: initialNodes, edges: initialEdges };

    const parsedFlow = JSON.parse(savedFlow);
    if (!Array.isArray(parsedFlow.nodes) || !Array.isArray(parsedFlow.edges)) {
      return { nodes: initialNodes, edges: initialEdges };
    }

    return {
      nodes: parsedFlow.nodes,
      edges: parsedFlow.edges,
    };
  } catch {
    return { nodes: initialNodes, edges: initialEdges };
  }
}

function createNode(type, x, y) {
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

function clampNodePosition(position) {
  return {
    x: clamp(position.x, 0, CANVAS_WIDTH - NODE_WIDTH),
    y: clamp(position.y, 0, CANVAS_HEIGHT - NODE_HEIGHT),
  };
}

function App() {
  const canvasRef = useRef(null);
  const nodeDragFrameRef = useRef(null);
  const nodeDragPositionRef = useRef(null);
  const suppressNodeClickRef = useRef(false);
  const selectionMovedRef = useRef(false);
  const canvasActiveRef = useRef(false);
  const panFrameRef = useRef(null);
  const panPositionRef = useRef(null);

  const [nodes, setNodes] = useState(() => loadSavedFlow().nodes);
  const [edges, setEdges] = useState(() => loadSavedFlow().edges);
  const [selectedIds, setSelectedIds] = useState([]);
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  const [jsonOutput, setJsonOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isNodeDragging, setIsNodeDragging] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [selectionBox, setSelectionBox] = useState(null);
  const [runnerOpen, setRunnerOpen] = useState(false);
  const [runnerMessages, setRunnerMessages] = useState([]);
  const [runnerStatus, setRunnerStatus] = useState('idle');
  const [runnerInput, setRunnerInput] = useState('');
  const [runnerContext, setRunnerContext] = useState({ variables: {}, actions: [] });
  const [waitingNodeId, setWaitingNodeId] = useState(null);

  const selectedNode = selectedIds.length === 1 ? nodes.find((node) => node.id === selectedIds[0]) : null;
  const selectedCount = selectedIds.length;
  const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId);
  const hasSelection = selectedCount > 0 || Boolean(selectedEdge);

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

  const botJson = useMemo(() => buildScenario(nodes, edges), [nodes, edges]);

  useEffect(() => {
    window.localStorage.setItem(FLOW_STORAGE_KEY, JSON.stringify({ nodes, edges }));
  }, [nodes, edges]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    requestAnimationFrame(() => {
      canvas.scrollLeft = CANVAS_WIDTH / 2 - canvas.clientWidth / 2;
      canvas.scrollTop = CANVAS_HEIGHT / 2 - canvas.clientHeight / 2;
    });
  }, []);

  function screenToCanvas(clientX, clientY) {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left + canvasRef.current.scrollLeft) / zoom,
      y: (clientY - rect.top + canvasRef.current.scrollTop) / zoom,
    };
  }

  function handlePaletteDragStart(event, type) {
    event.dataTransfer.setData('application/flow-node', type);
    event.dataTransfer.effectAllowed = 'copy';
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
    setSelectedEdgeId(null);
    setRightPanelOpen(true);
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
    setSelectedEdgeId(null);
    setRightPanelOpen(true);
    setIsNodeDragging(true);

    function onPointerMove(event) {
      const nextPoint = screenToCanvas(event.clientX, event.clientY);
      const requestedDeltaX = nextPoint.x - startPoint.x;
      const requestedDeltaY = nextPoint.y - startPoint.y;
      const minX = Math.min(...startNodes.map((node) => node.position.x));
      const minY = Math.min(...startNodes.map((node) => node.position.y));
      const maxX = Math.max(...startNodes.map((node) => node.position.x + NODE_WIDTH));
      const maxY = Math.max(...startNodes.map((node) => node.position.y + NODE_HEIGHT));
      const deltaX = clamp(requestedDeltaX, -minX, CANVAS_WIDTH - maxX);
      const deltaY = clamp(requestedDeltaY, -minY, CANVAS_HEIGHT - maxY);

      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        suppressNodeClickRef.current = true;
      }

      nodeDragPositionRef.current = startNodes.map((node) => ({
        id: node.id,
        position: {
          x: node.position.x + deltaX,
          y: node.position.y + deltaY,
        },
      }));

      if (nodeDragFrameRef.current) return;

      nodeDragFrameRef.current = requestAnimationFrame(() => {
        const nextPositions = nodeDragPositionRef.current;
        nodeDragFrameRef.current = null;
        if (!nextPositions) return;

        setNodes((current) =>
          current.map((node) => {
            const nextNode = nextPositions.find((item) => item.id === node.id);
            return nextNode ? { ...node, position: nextNode.position } : node;
          }),
        );
      });
    }

    function onPointerUp() {
      if (nodeDragFrameRef.current) {
        cancelAnimationFrame(nodeDragFrameRef.current);
        nodeDragFrameRef.current = null;
      }

      const finalPositions = nodeDragPositionRef.current;
      if (finalPositions) {
        setNodes((current) =>
          current.map((node) => {
            const nextNode = finalPositions.find((item) => item.id === node.id);
            return nextNode ? { ...node, position: nextNode.position } : node;
          }),
        );
      }

      nodeDragPositionRef.current = null;
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

  function handleCanvasPointerDown(event) {
    canvasActiveRef.current = true;

    if (event.button === 0) {
      startSelection(event);
      return;
    }

    if (event.button !== 2) return;

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
      if (panFrameRef.current) {
        cancelAnimationFrame(panFrameRef.current);
        panFrameRef.current = null;
      }

      const finalPosition = panPositionRef.current;
      if (finalPosition) {
        canvas.scrollLeft = finalPosition.left;
        canvas.scrollTop = finalPosition.top;
      }

      panPositionRef.current = null;
      setIsPanning(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }

  function startSelection(event) {
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
      setSelectedEdgeId(null);
      setRightPanelOpen(nextSelectedIds.length > 0);
      setSelectionBox(null);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }

  function zoomCanvasFromWheel(event) {
    const canvas = canvasRef.current;
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

  useEffect(() => {
    function handleNativeWheel(event) {
      if (!event.ctrlKey) return;

      event.preventDefault();
      zoomCanvasFromWheel(event);
    }

    window.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleNativeWheel);
  }, [zoom]);

  function updateSelectedNode(path, value) {
    setNodes((current) =>
      current.map((node) => {
        if (node.id !== selectedNode?.id) return node;
        if (path === 'label') return { ...node, label: value };
        return { ...node, data: { ...node.data, [path]: value } };
      }),
    );
  }

  function updateSelectedEdge(path, value) {
    if (!selectedEdgeId) return;

    setEdges((current) =>
      current.map((edge) =>
        edge.id === selectedEdgeId ? { ...edge, [path]: value } : edge,
      ),
    );
  }

  function deleteSelectedNodes() {
    if (selectedIds.length === 0) return;
    setNodes((current) => current.filter((node) => !selectedIds.includes(node.id)));
    setEdges((current) =>
      current.filter((edge) => !selectedIds.includes(edge.source) && !selectedIds.includes(edge.target)),
    );
    setSelectedIds([]);
    setSelectedEdgeId(null);
    setRightPanelOpen(false);
  }

  function selectEdge(edgeId) {
    setSelectedIds([]);
    setSelectedEdgeId(edgeId);
    setRightPanelOpen(true);
  }

  useEffect(() => {
    function handleKeyDown(event) {
      const activeElement = document.activeElement;
      const isTyping =
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.isContentEditable;

      if (isTyping) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a' && canvasActiveRef.current) {
        event.preventDefault();
        setSelectedIds(nodes.map((node) => node.id));
        setSelectedEdgeId(null);
        setRightPanelOpen(nodes.length > 0);
        return;
      }

      if (selectedIds.length === 0 && !selectedEdgeId) return;

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        if (selectedEdgeId) {
          removeEdge(selectedEdgeId);
          setSelectedEdgeId(null);
          setRightPanelOpen(false);
        } else {
          deleteSelectedNodes();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, selectedIds, selectedEdgeId]);

  function handleOutputClick(nodeId) {
    setConnectingFrom(connectingFrom === nodeId ? null : nodeId);
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

  function removeEdge(edgeId) {
    setEdges((current) => current.filter((edge) => edge.id !== edgeId));
    if (selectedEdgeId === edgeId) {
      setSelectedEdgeId(null);
      setRightPanelOpen(false);
    }
  }

  function buildJson() {
    setJsonOutput(JSON.stringify(botJson, null, 2));
    setCopied(false);
    setRightPanelOpen(true);
  }

  function handleRunFlow() {
    window.alert('Chức năng Run Flow sẽ có trong bản cập nhật sau.');
  }

  function startRunner() {
    const startNode = nodes.find((node) => node.type === 'start');

    setRunnerOpen(true);
    setRunnerInput('');
    setWaitingNodeId(null);

    if (!startNode) {
      setRunnerStatus('error');
      setRunnerMessages([
        createRunnerMessage('error', 'Flow needs one Start node before it can run.'),
      ]);
      return;
    }

    const nextContext = { variables: {}, actions: [] };
    setRunnerContext(nextContext);
    setRunnerMessages([]);
    runFromNode(startNode.id, nextContext, []);
  }

  function resetRunner() {
    setRunnerOpen(false);
    setRunnerMessages([]);
    setRunnerStatus('idle');
    setRunnerInput('');
    setRunnerContext({ variables: {}, actions: [] });
    setWaitingNodeId(null);
  }

  function runFromNode(startNodeId, context, leadingMessages) {
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    const outgoing = getOutgoingEdges(edges);
    const nextContext = {
      variables: { ...context.variables },
      actions: [...context.actions],
    };
    const nextMessages = [...leadingMessages];
    let currentNodeId = startNodeId;

    setRunnerStatus('running');

    for (let step = 0; step < MAX_RUN_STEPS; step += 1) {
      if (!currentNodeId) {
        finishRunner(nextContext, nextMessages, 'Flow finished.');
        return;
      }

      const node = nodeMap.get(currentNodeId);
      if (!node) {
        failRunner(nextContext, nextMessages, `Node not found: ${currentNodeId}`);
        return;
      }

      const nodeEdges = outgoing[node.id] || [];

      if (node.type === 'start' || node.type === 'message') {
        if (node.data.message) {
          nextMessages.push(createRunnerMessage('bot', resolveTemplate(node.data.message, nextContext.variables)));
        }
        currentNodeId = pickNextEdge(nodeEdges)?.target;
        continue;
      }

      if (node.type === 'question') {
        nextMessages.push(createRunnerMessage('bot', resolveTemplate(node.data.message || 'Please enter a value.', nextContext.variables)));
        setRunnerContext(nextContext);
        setRunnerMessages((current) => [...current, ...nextMessages]);
        setWaitingNodeId(node.id);
        setRunnerStatus('waiting');
        return;
      }

      if (node.type === 'condition') {
        const result = evaluateCondition(node.data, nextContext.variables);
        nextMessages.push(
          createRunnerMessage(
            'system',
            `Condition ${node.data.variable || 'value'} ${node.data.condition || ''}: ${result ? 'true' : 'false'}`,
          ),
        );
        currentNodeId = pickConditionEdge(nodeEdges, result)?.target;
        continue;
      }

      if (node.type === 'action') {
        const payload = resolveTemplate(node.data.payload || '{}', nextContext.variables);
        nextContext.actions.push({ action: node.data.action, payload });
        nextMessages.push(createRunnerMessage('system', `Action: ${node.data.action || 'unnamed'} ${payload}`));
        currentNodeId = pickNextEdge(nodeEdges)?.target;
        continue;
      }

      failRunner(nextContext, nextMessages, `Unsupported node type: ${node.type}`);
      return;
    }

    failRunner(nextContext, nextMessages, 'Flow stopped because it exceeded the maximum run steps.');
  }

  function finishRunner(context, messages, text) {
    setRunnerContext(context);
    setRunnerMessages((current) => [...current, ...messages, createRunnerMessage('system', text)]);
    setWaitingNodeId(null);
    setRunnerStatus('ended');
  }

  function failRunner(context, messages, text) {
    setRunnerContext(context);
    setRunnerMessages((current) => [...current, ...messages, createRunnerMessage('error', text)]);
    setWaitingNodeId(null);
    setRunnerStatus('error');
  }

  function handleRunnerSubmit(event) {
    event.preventDefault();
    if (runnerStatus !== 'waiting' || !waitingNodeId) return;

    const answer = runnerInput.trim();
    if (!answer) return;

    const questionNode = nodes.find((node) => node.id === waitingNodeId);
    if (!questionNode) {
      failRunner(runnerContext, [createRunnerMessage('user', answer)], 'Waiting question node was removed.');
      return;
    }

    const variable = questionNode.data.variable || questionNode.id;
    const nextContext = {
      ...runnerContext,
      variables: {
        ...runnerContext.variables,
        [variable]: answer,
      },
    };
    const nextEdge = pickNextEdge(edges.filter((edge) => edge.source === questionNode.id));

    setRunnerInput('');
    setWaitingNodeId(null);
    runFromNode(nextEdge?.target, nextContext, [createRunnerMessage('user', answer)]);
  }

  async function copyJson() {
    const text = jsonOutput || JSON.stringify(botJson, null, 2);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function downloadJson() {
    const blob = new Blob([jsonOutput || JSON.stringify(botJson, null, 2)], { type: 'application/json' });
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
        <aside
          className={`absolute left-0 z-20 w-[260px] overflow-visible border-r border-slate-200 bg-white shadow-panel transition-transform ${paletteOpen ? 'translate-x-0' : '-translate-x-full'}`}
          style={{ top: HEADER_HEIGHT, height: `calc(100% - ${HEADER_HEIGHT}px)` }}
        >
          <button
            type="button"
            onClick={() => setPaletteOpen((open) => !open)}
            className={`absolute -right-5 top-3 z-20 grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md hover:bg-slate-50 ${paletteOpen ? '' : 'justify-items-end pr-1.5'}`}
            title={paletteOpen ? 'Collapse Node palette' : 'Open Node palette'}
          >
            {paletteOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
          <div className="h-full overflow-auto p-4">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Plus size={18} />
              Node palette
            </div>
            <div className="space-y-3">
              {Object.entries(NODE_TYPES).map(([type, spec]) => {
                const Icon = spec.icon;
                return (
                  <button
                    key={type}
                    type="button"
                    draggable
                    onDragStart={(event) => handlePaletteDragStart(event, type)}
                    className={`flex w-full cursor-grab items-start gap-3 rounded-lg border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${spec.color}`}
                  >
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md text-white ${spec.accent}`}>
                      <Icon size={18} />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{spec.title}</span>
                      <span className="mt-1 block text-xs opacity-75">{spec.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
              <div className="mb-2 flex items-center gap-2 font-semibold text-slate-700">
                <Hand size={16} />
                Controls
              </div>
              Drag nodes in. Ctrl + wheel zooms. Right mouse drag pans. Left drag empty space selects nodes.
            </div>
          </div>
        </aside>

        <div className="flex h-full min-h-0 flex-col">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-950 text-white">
                <Route size={22} />
              </div>
              <div>
                <h1 className="text-xl font-semibold leading-tight">Flow Bot Builder</h1>
                <p className="text-sm text-slate-500">Drag, connect, and build a bot scenario JSON.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={startRunner}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <Play size={18} />
                Run
              </button>
              <button
                type="button"
                onClick={buildJson}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                <Braces size={18} />
                Build JSON
              </button>
            </div>
          </header>

          <div
            ref={canvasRef}
            onDrop={handleDrop}
            onDragOver={(event) => event.preventDefault()}
            onContextMenu={(event) => event.preventDefault()}
            onPointerDown={handleCanvasPointerDown}
            onPointerEnter={() => {
              canvasActiveRef.current = true;
            }}
            onPointerLeave={() => {
              canvasActiveRef.current = false;
            }}
            className={`canvas-grid relative min-h-0 flex-1 overflow-auto bg-[#f8fafc] ${isPanning || isNodeDragging ? 'cursor-grabbing' : 'cursor-default'}`}
          >
            <div className="relative" style={{ height: CANVAS_HEIGHT * zoom, width: CANVAS_WIDTH * zoom }}>
              <div
                className="absolute left-0 top-0"
                style={{
                  height: CANVAS_HEIGHT,
                  width: CANVAS_WIDTH,
                  transform: `scale(${zoom})`,
                  transformOrigin: '0 0',
                }}
              >
                <svg className="absolute inset-0" style={{ height: CANVAS_HEIGHT, width: CANVAS_WIDTH }}>
                  <defs>
                    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
                    </marker>
                  </defs>
                  {edgeLines.map((edge) => {
                    const control = Math.max(70, Math.abs(edge.x2 - edge.x1) / 2);
                    const path = `M ${edge.x1} ${edge.y1} C ${edge.x1 + control} ${edge.y1}, ${edge.x2 - control} ${edge.y2}, ${edge.x2} ${edge.y2}`;
                    const selected = selectedEdgeId === edge.id;

                    return (
                      <g key={edge.id}>
                        <path
                          className="pointer-events-none"
                          d={path}
                          fill="none"
                          stroke={selected ? '#4f46e5' : '#475569'}
                          strokeWidth={selected ? '3.5' : '2.5'}
                          markerEnd="url(#arrow)"
                        />
                        <path
                          d={path}
                          fill="none"
                          stroke="transparent"
                          strokeWidth="16"
                          className="cursor-pointer"
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.stopPropagation();
                            selectEdge(edge.id);
                          }}
                        />
                      </g>
                    );
                  })}
                </svg>

                {selectionBox && (
                  <div
                    className="pointer-events-none absolute border border-indigo-500 bg-indigo-500/10"
                    style={{
                      left: selectionBox.x,
                      top: selectionBox.y,
                      width: selectionBox.width,
                      height: selectionBox.height,
                    }}
                  />
                )}

                <div className="relative h-full w-full">
                  {nodes.map((node) => (
                    <FlowNode
                      key={node.id}
                      node={node}
                      selected={selectedIds.includes(node.id)}
                      connecting={connectingFrom === node.id}
                      dragging={isNodeDragging && selectedIds.includes(node.id)}
                      onPointerDown={moveNode}
                      onSelect={(nodeId) => {
                        if (suppressNodeClickRef.current) return;
                        setSelectedIds([nodeId]);
                        setSelectedEdgeId(null);
                        setRightPanelOpen(true);
                      }}
                      onInputClick={handleInputClick}
                      onOutputClick={handleOutputClick}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          {runnerOpen && (
            <section className="absolute bottom-5 left-1/2 z-30 flex h-[460px] w-[420px] -translate-x-1/2 flex-col rounded-lg border border-slate-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.32)]">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-slate-800">Flow Runner</div>
                  <div className="text-xs capitalize text-slate-500">{runnerStatus}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={startRunner}
                    className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                    title="Restart runner"
                  >
                    <RotateCcw size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={resetRunner}
                    className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                    title="Close runner"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-2 overflow-auto bg-slate-50 p-4">
                {runnerMessages.length === 0 ? (
                  <div className="rounded-md border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                    Click Run to start the flow.
                  </div>
                ) : (
                  runnerMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`max-w-[86%] rounded-lg px-3 py-2 text-sm ${
                        message.role === 'user'
                          ? 'ml-auto bg-slate-950 text-white'
                          : message.role === 'bot'
                            ? 'bg-white text-slate-800 shadow-sm'
                            : message.role === 'error'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-indigo-50 text-indigo-800'
                      }`}
                    >
                      {message.text}
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleRunnerSubmit} className="border-t border-slate-200 p-3">
                <div className="flex gap-2">
                  <input
                    value={runnerInput}
                    onChange={(event) => setRunnerInput(event.target.value)}
                    disabled={runnerStatus !== 'waiting'}
                    placeholder={runnerStatus === 'waiting' ? 'Type your answer...' : 'Runner is not waiting for input'}
                    className="h-10 min-w-0 flex-1 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-900 disabled:bg-slate-100"
                  />
                  <button
                    type="submit"
                    disabled={runnerStatus !== 'waiting'}
                    className="h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Send
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>

        <aside
          className={`absolute right-0 z-20 flex w-[340px] min-h-0 flex-col overflow-visible border-l border-slate-200 bg-white shadow-panel transition-transform ${rightPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}
          style={{ top: HEADER_HEIGHT, height: `calc(100% - ${HEADER_HEIGHT}px)` }}
        >
          <button
            type="button"
            onClick={() => setRightPanelOpen((open) => !open)}
            className={`absolute -left-5 top-3 z-20 grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md hover:bg-slate-50 ${rightPanelOpen ? '' : 'justify-items-start pl-1.5'}`}
            title={rightPanelOpen ? 'Collapse panel' : 'Open JSON output'}
          >
            {rightPanelOpen ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <div className="min-h-0 flex-1 overflow-auto">
            {selectedCount > 0 && (
              <div className="border-b border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <MousePointer2 size={18} />
                    Inspector
                  </div>
                  <button
                    type="button"
                    onClick={deleteSelectedNodes}
                    className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                    title="Delete selected nodes"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>

                {selectedNode ? (
                  <NodeEditor node={selectedNode} onChange={updateSelectedNode} />
                ) : (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    {selectedCount} nodes selected
                  </div>
                )}
              </div>
            )}

          {hasSelection && (
            <div className="border-b border-slate-200 p-4">
              <div className="mb-3 text-sm font-semibold text-slate-700">Connections</div>
              {selectedEdge && (
                <div className="mb-3 space-y-2 rounded-md border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-950">
                  <div className="font-semibold">Selected connection</div>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase text-indigo-700">Label</span>
                    <input
                      value={selectedEdge.label}
                      onChange={(event) => updateSelectedEdge('label', event.target.value)}
                      className="h-9 w-full rounded-md border border-indigo-200 bg-white px-2 text-xs text-slate-900 outline-none focus:border-indigo-500"
                      placeholder="next, true, false"
                    />
                  </label>
                </div>
              )}
              <div className="max-h-40 space-y-2 overflow-auto pr-1">
                {edges.length === 0 ? (
                  <p className="text-sm text-slate-500">No connections.</p>
                ) : (
                  edges.map((edge) => {
                    const source = nodes.find((node) => node.id === edge.source);
                    const target = nodes.find((node) => node.id === edge.target);
                    const selected = selectedEdgeId === edge.id;
                    return (
                      <div
                        key={edge.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => selectEdge(edge.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') selectEdge(edge.id);
                        }}
                        className={`flex items-center justify-between gap-2 rounded-md border px-2 py-2 text-xs ${selected ? 'border-indigo-300 bg-indigo-50 text-indigo-950' : 'border-slate-200'}`}
                      >
                        <span className="min-w-0 truncate">
                          {source?.label || 'Missing'} <ChevronRight className="inline" size={13} /> {target?.label || 'Missing'}
                        </span>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeEdge(edge.id);
                          }}
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          title="Delete connection"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

            <div className="flex h-[360px] flex-col p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-slate-700">JSON output</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copyJson}
                  className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                  title="Copy JSON"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
                <button
                  type="button"
                  onClick={downloadJson}
                  className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                  title="Download JSON"
                >
                  <Download size={16} />
                </button>
              </div>
            </div>
              <pre className="min-h-0 flex-1 overflow-auto rounded-lg bg-slate-950 p-3 text-xs leading-5 text-emerald-100">
              {jsonOutput || JSON.stringify(botJson, null, 2)}
            </pre>
          </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function FlowNode({ node, selected, connecting, dragging, onPointerDown, onSelect, onInputClick, onOutputClick }) {
  const spec = NODE_TYPES[node.type];
  const Icon = spec.icon;

  return (
    <div
      data-flow-node
      onClick={(event) => {
        event.stopPropagation();
        onSelect(node.id);
      }}
      onPointerDown={(event) => {
        if (event.target.closest('[data-port]')) return;
        onPointerDown(node.id, event);
      }}
      className={`absolute w-56 select-none rounded-lg border-2 bg-white shadow-panel will-change-transform transition-[border-color,box-shadow] ${dragging ? 'cursor-grabbing' : 'cursor-grab'} ${selected ? 'border-slate-950 ring-2 ring-slate-300' : 'border-slate-200'} ${connecting ? 'ring-4 ring-indigo-200' : ''}`}
      style={{ transform: `translate(${node.position.x}px, ${node.position.y}px)` }}
    >
      <button
        type="button"
        data-port="input"
        onClick={(event) => {
          event.stopPropagation();
          onInputClick(node.id);
        }}
        className="absolute -left-3 top-10 h-6 w-6 rounded-full border-2 border-white bg-slate-500 shadow hover:bg-slate-700"
        title="Input port"
      />
      <button
        type="button"
        data-port="output"
        onClick={(event) => {
          event.stopPropagation();
          onOutputClick(node.id);
        }}
        className={`absolute -right-3 top-10 h-6 w-6 rounded-full border-2 border-white shadow ${connecting ? 'bg-indigo-600' : 'bg-slate-500 hover:bg-slate-700'}`}
        title="Output port"
      />
      <div className={`flex items-center gap-2 rounded-t-md border-b px-3 py-2 ${spec.color}`}>
        <span className={`grid h-8 w-8 place-items-center rounded-md text-white ${spec.accent}`}>
          <Icon size={17} />
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{node.label}</div>
          <div className="truncate text-xs opacity-70">{spec.title}</div>
        </div>
      </div>
      <div className="space-y-2 p-3 text-xs text-slate-600">
        {Object.entries(node.data).slice(0, 2).map(([key, value]) => (
          <div key={key} className="rounded-md bg-slate-50 px-2 py-1.5">
            <span className="font-semibold text-slate-500">{key}: </span>
            <span>{String(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NodeEditor({ node, onChange }) {
  const fields = Object.keys(node.data);

  return (
    <div className="mt-4 space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Label</span>
        <input
          value={node.label}
          onChange={(event) => onChange('label', event.target.value)}
          className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-900"
        />
      </label>

      {fields.map((field) => {
        const value = node.data[field];
        const multiline = field === 'message' || field === 'payload';
        return (
          <label key={field} className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{field}</span>
            {multiline ? (
              <textarea
                value={value}
                onChange={(event) => onChange(field, event.target.value)}
                rows={field === 'payload' ? 4 : 3}
                className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
              />
            ) : (
              <input
                value={value}
                onChange={(event) => onChange(field, event.target.value)}
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-900"
              />
            )}
          </label>
        );
      })}
    </div>
  );
}

function normalizeBox(start, end) {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

function getNodesInBox(nodes, box) {
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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function createRunnerMessage(role, text) {
  return {
    id: `runner-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    role,
    text,
  };
}

function getOutgoingEdges(edges) {
  return edges.reduce((map, edge) => {
    map[edge.source] = map[edge.source] || [];
    map[edge.source].push(edge);
    return map;
  }, {});
}

function pickNextEdge(edges) {
  return edges.find((edge) => edge.label?.toLowerCase() === 'next') || edges[0];
}

function pickConditionEdge(edges, result) {
  const preferredLabel = result ? 'true' : 'false';
  const fallbackIndex = result ? 0 : 1;

  return (
    edges.find((edge) => edge.label?.toLowerCase() === preferredLabel) ||
    edges[fallbackIndex] ||
    edges[0]
  );
}

function evaluateCondition(data, variables) {
  const variableValue = String(variables[data.variable] ?? '').trim().toLowerCase();
  const condition = String(data.condition || '').trim().toLowerCase();

  if (!condition) return Boolean(variableValue);

  if (condition.startsWith('equals ')) {
    return variableValue === condition.replace('equals ', '').trim();
  }

  if (condition.startsWith('not equals ')) {
    return variableValue !== condition.replace('not equals ', '').trim();
  }

  if (condition.startsWith('contains ')) {
    return variableValue.includes(condition.replace('contains ', '').trim());
  }

  return variableValue === condition;
}

function resolveTemplate(value, variables) {
  return String(value).replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key) => variables[key] ?? '');
}

function buildScenario(nodes, edges) {
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

export default App;
