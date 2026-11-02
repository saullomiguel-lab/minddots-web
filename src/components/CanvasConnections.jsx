import React from 'react';
import { getPortPosition, getBezierPath, getBezierControlPoints } from '../constants';

export default function CanvasConnections({
  connections,
  nodes,
  selectedConnectionId,
  connecting,
  transform,
  onSelectConnection,
  onStartReanchor,
  onStartDragCP,
  onResetCurve
}) {
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
      <defs>
        <marker id="arrow-fixed" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#94A3B8" />
        </marker>
        <marker id="arrow-drag" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#2563EB" />
        </marker>
      </defs>

      <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
        {connections.map((conn) => {
          const fromNode = nodes.find((n) => n.id === conn.fromNodeId);
          const toNode = nodes.find((n) => n.id === conn.toNodeId);
          if (!fromNode || !toNode) return null;

          const p1 = getPortPosition(fromNode, conn.fromPortIndex);
          const p2 = getPortPosition(toNode, conn.toPortIndex);
          const isConnSelected = selectedConnectionId === conn.id;

          if (connecting?.replaceConnectionId === conn.id) return null;

          return (
            <g key={conn.id}>
              {/* Linha visível */}
              <path
                d={getBezierPath(p1, p2, conn)}
                fill="none"
                stroke={isConnSelected ? '#2563EB' : '#94A3B8'}
                strokeWidth={isConnSelected ? 3.2 : 2}
                strokeLinecap="round"
                markerEnd={isConnSelected ? 'url(#arrow-drag)' : 'url(#arrow-fixed)'}
                style={{ transition: 'stroke 0.15s, stroke-width 0.15s' }}
              />

              {/* Área ampla de toque invisível (30px) */}
              <path
                d={getBezierPath(p1, p2, conn)}
                fill="none"
                stroke="transparent"
                strokeWidth={30}
                style={{ pointerEvents: 'stroke', cursor: 'pointer', touchAction: 'none' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectConnection(conn.id);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  onSelectConnection(conn.id);
                }}
              />

              {/* Controles de Curvatura quando a linha está selecionada */}
              {isConnSelected && (() => {
                const { cp1, cp2 } = getBezierControlPoints(p1, p2, conn);
                const midX = 0.125 * p1.x + 0.375 * cp1.x + 0.375 * cp2.x + 0.125 * p2.x;
                const midY = 0.125 * p1.y + 0.375 * cp1.y + 0.375 * cp2.y + 0.125 * p2.y;

                return (
                  <g>
                    {/* Linhas pontilhadas guias */}
                    <line x1={p1.x} y1={p1.y} x2={cp1.x} y2={cp1.y} stroke="#3B82F6" strokeWidth={1.5} strokeDasharray="4,4" opacity="0.6" />
                    <line x1={p2.x} y1={p2.y} x2={cp2.x} y2={cp2.y} stroke="#3B82F6" strokeWidth={1.5} strokeDasharray="4,4" opacity="0.6" />

                    {/* Alça de Curvatura 1 */}
                    <circle cx={cp1.x} cy={cp1.y} r={22} fill="transparent" style={{ cursor: 'move', pointerEvents: 'auto', touchAction: 'none' }} onMouseDown={(e) => onStartDragCP(e, conn, 1)} onTouchStart={(e) => { const t = e.touches[0]; onStartDragCP({ clientX: t.clientX, clientY: t.clientY, stopPropagation: () => e.stopPropagation() }, conn, 1); }} />
                    <circle cx={cp1.x} cy={cp1.y} r={7} fill="#FFFFFF" stroke="#3B82F6" strokeWidth={2.5} pointerEvents="none" />

                    {/* Alça de Curvatura 2 */}
                    <circle cx={cp2.x} cy={cp2.y} r={22} fill="transparent" style={{ cursor: 'move', pointerEvents: 'auto', touchAction: 'none' }} onMouseDown={(e) => onStartDragCP(e, conn, 2)} onTouchStart={(e) => { const t = e.touches[0]; onStartDragCP({ clientX: t.clientX, clientY: t.clientY, stopPropagation: () => e.stopPropagation() }, conn, 2); }} />
                    <circle cx={cp2.x} cy={cp2.y} r={7} fill="#FFFFFF" stroke="#3B82F6" strokeWidth={2.5} pointerEvents="none" />

                    {/* Bolinha vermelha central para redefinir curvatura */}
                    {(conn.cp1Offset || conn.cp2Offset) && (
                      <g>
                        <circle cx={midX} cy={midY} r={18} fill="transparent" style={{ cursor: 'pointer', pointerEvents: 'auto' }} onMouseDown={(e) => onResetCurve(e, conn.id)} onTouchStart={(e) => onResetCurve(e, conn.id)} />
                        <circle cx={midX} cy={midY} r={6} fill="#EF4444" stroke="#FFFFFF" strokeWidth={2} pointerEvents="none" />
                      </g>
                    )}
                  </g>
                );
              })()}

              {/* Alças de Reconexão (ponta da seta e base) */}
              {isConnSelected && (
                <>
                  {/* Ponta da Seta (Target) */}
                  <g>
                    <circle
                      cx={p2.x}
                      cy={p2.y}
                      r={24}
                      fill="transparent"
                      style={{ cursor: 'crosshair', pointerEvents: 'auto', touchAction: 'none' }}
                      onMouseDown={(e) => onStartReanchor(e, conn, 'to')}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        if (e.cancelable) e.preventDefault();
                        const t = e.touches[0];
                        onStartReanchor({ clientX: t.clientX, clientY: t.clientY, stopPropagation: () => e.stopPropagation() }, conn, 'to');
                      }}
                    />
                    <circle cx={p2.x} cy={p2.y} r={8} fill="#2563EB" stroke="#FFFFFF" strokeWidth={2.5} pointerEvents="none" />
                  </g>

                  {/* Base da Seta (Origin) */}
                  <g>
                    <circle
                      cx={p1.x}
                      cy={p1.y}
                      r={24}
                      fill="transparent"
                      style={{ cursor: 'crosshair', pointerEvents: 'auto', touchAction: 'none' }}
                      onMouseDown={(e) => onStartReanchor(e, conn, 'from')}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        if (e.cancelable) e.preventDefault();
                        const t = e.touches[0];
                        onStartReanchor({ clientX: t.clientX, clientY: t.clientY, stopPropagation: () => e.stopPropagation() }, conn, 'from');
                      }}
                    />
                    <circle cx={p1.x} cy={p1.y} r={7} fill="#FFFFFF" stroke="#2563EB" strokeWidth={2.5} pointerEvents="none" />
                  </g>
                </>
              )}
            </g>
          );
        })}

        {/* Linha elástica sendo puxada */}
        {connecting && (
          <path
            d={
              connecting.reanchorEnd === 'from'
                ? getBezierPath(
                    { x: connecting.currentX, y: connecting.currentY },
                    getPortPosition(
                      nodes.find((n) => n.id === connecting.targetNodeId),
                      connecting.targetPortIndex
                    )
                  )
                : getBezierPath(
                    getPortPosition(
                      nodes.find((n) => n.id === connecting.fromNodeId),
                      connecting.fromPortIndex
                    ),
                    { x: connecting.currentX, y: connecting.currentY }
                  )
            }
            fill="none"
            stroke="#2563EB"
            strokeWidth={2.5}
            strokeDasharray="5,5"
            markerEnd="url(#arrow-drag)"
          />
        )}
      </g>
    </svg>
  );
}
