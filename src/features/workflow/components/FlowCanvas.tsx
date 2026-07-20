import { FlowNode } from './FlowNode';

export function FlowCanvas({
  canvas,
  nodes,
  edgeLines,
  selectedIds,
  selectedEdgeId,
  connectingFrom,
  onSelectEdge,
  onMoveNode,
  onSelectNode,
  onInputClick,
  onOutputClick,
  runner,
}) {
  return (
    <div
      ref={canvas.canvasRef}
      onDrop={canvas.handleDrop}
      {...canvas.canvasHandlers}
      className={`relative min-h-0 flex-1 overflow-auto bg-[#f8fafc] ${canvas.isPanning || canvas.isNodeDragging ? 'cursor-grabbing' : 'cursor-default'}`}
    >
      <div
        className="relative"
        style={{
          height: canvas.canvasSize.height * canvas.zoom,
          width: canvas.canvasSize.width * canvas.zoom,
        }}
      >
        <div
          className="canvas-grid absolute left-0 top-0"
          style={{
            height: canvas.canvasSize.height,
            width: canvas.canvasSize.width,
            transform: `scale(${canvas.zoom})`,
            transformOrigin: '0 0',
          }}
        >
          <svg
            className="absolute inset-0"
            style={{ height: canvas.canvasSize.height, width: canvas.canvasSize.width }}
          >
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
              </marker>
            </defs>
            {edgeLines.map((edge) => (
              <EdgePath
                key={edge.id}
                edge={edge}
                selected={selectedEdgeId === edge.id}
                onSelectEdge={onSelectEdge}
              />
            ))}
          </svg>

          {canvas.selectionBox && (
            <div
              className="pointer-events-none absolute border border-indigo-500 bg-indigo-500/10"
              style={{
                left: canvas.selectionBox.x,
                top: canvas.selectionBox.y,
                width: canvas.selectionBox.width,
                height: canvas.selectionBox.height,
              }}
            />
          )}

          <div className="pointer-events-none relative h-full w-full">
            {nodes.map((node) => (
              <FlowNode
                key={node.id}
                node={node}
                selected={selectedIds.includes(node.id)}
                connecting={connectingFrom === node.id}
                dragging={canvas.isNodeDragging && selectedIds.includes(node.id)}
                onPointerDown={onMoveNode}
                onSelect={(nodeId) => {
                  if (canvas.suppressNodeClickRef.current) return;
                  onSelectNode(nodeId);
                }}
                onInputClick={onInputClick}
                onOutputClick={onOutputClick}
              />
            ))}
          </div>
        </div>
      </div>
      {runner}
    </div>
  );
}

function EdgePath({ edge, selected, onSelectEdge }) {
  const control = Math.max(70, Math.abs(edge.x2 - edge.x1) / 2);
  const path = `M ${edge.x1} ${edge.y1} C ${edge.x1 + control} ${edge.y1}, ${edge.x2 - control} ${edge.y2}, ${edge.x2} ${edge.y2}`;

  return (
    <g>
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
          onSelectEdge(edge.id);
        }}
      />
    </g>
  );
}
