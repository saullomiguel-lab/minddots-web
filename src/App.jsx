import React, { useState, useRef, useEffect, useCallback } from 'react';
import Toolbar from './components/Toolbar';
import TabsBar from './components/TabsBar';
import { getPortPosition, getBezierPath } from './constants';
import { supabase } from './supabaseClient';

const INITIAL_DATA = [
  {
    id: 'tab-1',
    title: 'Mapa 1',
    nodes: [
      {
        id: 'node-1',
        x: 350,
        y: 250,
        text: 'Ideia Central',
        color: '#FFFFFF',
        fontSize: 16,
        align: 'center',
        image: null
      }
    ],
    connections: []
  }
];

export default function App() {
  const [tabs, setTabs] = useState(INITIAL_DATA);
  const [activeTabId, setActiveTabId] = useState('tab-1');
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  // Pan & Zoom
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Arrastar nós
  const [draggingNode, setDraggingNode] = useState(null);

  // Conexões Bézier
  const [connecting, setConnecting] = useState(null);

  const containerRef = useRef(null);
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // Atalho da tecla 'P' para centralizar
  const handleResetView = useCallback(() => {
    if (!activeTab.nodes.length) {
      setTransform({ x: 0, y: 0, scale: 1 });
      return;
    }
    const avgX = activeTab.nodes.reduce((acc, n) => acc + n.x, 0) / activeTab.nodes.length;
    const avgY = activeTab.nodes.reduce((acc, n) => acc + n.y, 0) / activeTab.nodes.length;
    setTransform({
      x: window.innerWidth / 2 - avgX,
      y: window.innerHeight / 2 - avgY,
      scale: 1
    });
  }, [activeTab]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'p' || e.key === 'P') && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        handleResetView();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleResetView]);

  // Zoom centrado no mouse
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const newScale = Math.min(Math.max(transform.scale * zoomFactor, 0.25), 3);

    const mouseX = e.clientX;
    const mouseY = e.clientY;

    const newX = mouseX - (mouseX - transform.x) * (newScale / transform.scale);
    const newY = mouseY - (mouseY - transform.y) * (newScale / transform.scale);

    setTransform({ x: newX, y: newY, scale: newScale });
  };

  // Gerenciamento de nós
  const updateActiveTabData = (updater) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? updater(t) : t))
    );
  };

  const handleAddNode = () => {
    const newNode = {
      id: `node-${Date.now()}`,
      x: -transform.x + window.innerWidth / 2 - 80,
      y: -transform.y + window.innerHeight / 2 - 30,
      text: 'Novo Tópico',
      color: '#FFFFFF',
      fontSize: 14,
      align: 'left',
      image: null
    };
    updateActiveTabData((t) => ({ ...t, nodes: [...t.nodes, newNode] }));
    setSelectedNodeId(newNode.id);
  };

  const handleAddImage = (imageDataUrl) => {
    if (selectedNodeId) {
      updateSelectedNode({ image: imageDataUrl });
    } else {
      const newNode = {
        id: `node-${Date.now()}`,
        x: -transform.x + window.innerWidth / 2 - 100,
        y: -transform.y + window.innerHeight / 2 - 80,
        text: '',
        color: '#FFFFFF',
        fontSize: 14,
        align: 'center',
        image: imageDataUrl
      };
      updateActiveTabData((t) => ({ ...t, nodes: [...t.nodes, newNode] }));
      setSelectedNodeId(newNode.id);
    }
  };

  const updateSelectedNode = (patch) => {
    updateActiveTabData((t) => ({
      ...t,
      nodes: t.nodes.map((n) => (n.id === selectedNodeId ? { ...n, ...patch } : n))
    }));
  };

  // Iniciar Pan ou Conexão
  const handleMouseDown = (e) => {
    if (e.target === containerRef.current || e.button === 1 || e.button === 2) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
      setSelectedNodeId(null);
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      }));
    } else if (draggingNode) {
      const dx = (e.clientX - draggingNode.startX) / transform.scale;
      const dy = (e.clientY - draggingNode.startY) / transform.scale;
      updateActiveTabData((t) => ({
        ...t,
        nodes: t.nodes.map((n) =>
          n.id === draggingNode.id
            ? { ...n, x: draggingNode.origX + dx, y: draggingNode.origY + dy }
            : n
        )
      }));
    } else if (connecting) {
      const canvasMouseX = (e.clientX - transform.x) / transform.scale;
      const canvasMouseY = (e.clientY - transform.y) / transform.scale;
      setConnecting((prev) => ({ ...prev, currentX: canvasMouseX, currentY: canvasMouseY }));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNode(null);
    setConnecting(null);
  };

  // Conexões nas portas (0: Topo, 1: Direita, 2: Fundo, 3: Esquerda)
  const handlePortMouseDown = (e, nodeId, portIndex) => {
    e.stopPropagation();
    const node = activeTab.nodes.find((n) => n.id === nodeId);
    const pos = getPortPosition(node, portIndex);
    setConnecting({
      fromNodeId: nodeId,
      fromPortIndex: portIndex,
      currentX: pos.x,
      currentY: pos.y
    });
  };

  const handlePortMouseUp = (e, toNodeId, toPortIndex) => {
    e.stopPropagation();
    if (connecting && connecting.fromNodeId !== toNodeId) {
      const newConn = {
        id: `conn-${Date.now()}`,
        fromNodeId: connecting.fromNodeId,
        fromPortIndex: connecting.fromPortIndex,
        toNodeId,
        toPortIndex
      };
      updateActiveTabData((t) => ({ ...t, connections: [...t.connections, newConn] }));
    }
    setConnecting(null);
  };

  // Exportar mapa mental em JSON
  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(tabs, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `minddots-${activeTab.title.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
  };

  const selectedNode = activeTab.nodes.find((n) => n.id === selectedNodeId);

  return (
    <div
      ref={containerRef}
      className={`canvas-container ${isPanning ? 'panning' : ''}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Barra de Ferramentas Superior */}
      <Toolbar
        onAddNode={handleAddNode}
        onExport={handleExport}
        onAddImage={handleAddImage}
        selectedNode={selectedNode}
        onUpdateSelected={updateSelectedNode}
        onResetView={handleResetView}
      />

      {/* SVG para linhas das Curvas de Bézier */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: '0 0'
        }}
      >
        {/* Conexões Fixas (Cinza) */}
        {activeTab.connections.map((conn) => {
          const fromNode = activeTab.nodes.find((n) => n.id === conn.fromNodeId);
          const toNode = activeTab.nodes.find((n) => n.id === conn.toNodeId);
          if (!fromNode || !toNode) return null;
          const p1 = getPortPosition(fromNode, conn.fromPortIndex);
          const p2 = getPortPosition(toNode, conn.toPortIndex);
          return (
            <path
              key={conn.id}
              d={getBezierPath(p1, p2)}
              fill="none"
              stroke="#94A3B8"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          );
        })}

        {/* Conexão em Arrastamento (Azul Ativo) */}
        {connecting && (
          <path
            d={getBezierPath(
              getPortPosition(
                activeTab.nodes.find((n) => n.id === connecting.fromNodeId),
                connecting.fromPortIndex
              ),
              { x: connecting.currentX, y: connecting.currentY }
            )}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2.5"
            strokeDasharray="5,5"
          />
        )}
      </svg>

      {/* Camada com os Balões / Cards */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: '0 0'
        }}
      >
        {activeTab.nodes.map((node) => (
          <div
            key={node.id}
            className={`mind-node ${selectedNodeId === node.id ? 'selected' : ''}`}
            style={{
              left: `${node.x}px`,
              top: `${node.y}px`,
              backgroundColor: node.color || '#FFFFFF',
              fontSize: `${node.fontSize || 14}px`,
              textAlign: node.align || 'left'
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              setSelectedNodeId(node.id);
              setDraggingNode({
                id: node.id,
                startX: e.clientX,
                startY: e.clientY,
                origX: node.x,
                origY: node.y
              });
            }}
          >
            {/* 4 Pontos de Ancoragem (Portas) */}
            {[0, 1, 2, 3].map((portIdx) => {
              const portClass = ['port-top', 'port-right', 'port-bottom', 'port-left'][portIdx];
              return (
                <div
                  key={portIdx}
                  className={`port ${portClass}`}
                  onMouseDown={(e) => handlePortMouseDown(e, node.id, portIdx)}
                  onMouseUp={(e) => handlePortMouseUp(e, node.id, portIdx)}
                />
              );
            })}

            {/* Imagem (mantendo proporção e margem rente de 8px) */}
            {node.image && (
              <img
                src={node.image}
                alt=""
                style={{
                  width: '100%',
                  maxHeight: '180px',
                  objectFit: 'contain',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  display: 'block'
                }}
              />
            )}

            {/* Editor de Texto Integrado */}
            <div
              contentEditable
              suppressContentEditableWarning
              className="node-editor"
              onBlur={(e) => updateSelectedNode({ text: e.currentTarget.innerText })}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {node.text}
            </div>
          </div>
        ))}
      </div>

      {/* Barra de Abas no Rodapé */}
      <TabsBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={(id) => {
          setActiveTabId(id);
          setSelectedNodeId(null);
        }}
        onAddTab={() => {
          const newId = `tab-${Date.now()}`;
          const newTab = {
            id: newId,
            title: `Mapa ${tabs.length + 1}`,
            nodes: [{ id: `node-${Date.now()}`, x: 350, y: 250, text: 'Novo Tópico', color: '#FFFFFF', fontSize: 14, align: 'center', image: null }],
            connections: []
          };
          setTabs((prev) => [...prev, newTab]);
          setActiveTabId(newId);
        }}
        onRenameTab={(id, title) => {
          setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, title } : t)));
        }}
      />
    </div>
  );
}
