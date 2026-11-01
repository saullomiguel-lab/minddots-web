import React, { useState, useRef, useEffect, useCallback } from 'react';
import Toolbar from './components/Toolbar';
import TabsBar from './components/TabsBar';
import AuthModal from './components/AuthModal';
import ForcePasswordChangeModal from './components/ForcePasswordChangeModal';
import AdminPanel from './components/AdminPanel';
import MapsManagerModal from './components/MapsManagerModal';
import { getPortPosition, getBezierPath } from './constants';
import { supabase } from './supabaseClient';

export default function App() {
  // Estados de Autenticação e Perfil
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isMapsOpen, setIsMapsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Mapa Ativo e Abas
  const [currentMap, setCurrentMap] = useState(null);
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  // Pan, Zoom e Conexões
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const [draggingNode, setDraggingNode] = useState(null);
  const [connecting, setConnecting] = useState(null);
  const containerRef = useRef(null);

  // 1. Monitorar Sessão do Supabase
  const loadUserProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(data || null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) {
        loadUserProfile(session.user.id);
        setIsMapsOpen(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setProfile(null);
        setCurrentMap(null);
        setTabs([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Carregar Mapa Selecionado
  const handleSelectMap = (map) => {
    setCurrentMap(map);
    const loadedTabs = map.data?.tabs || [{ id: 'tab-1', title: 'Mapa 1', nodes: [], connections: [] }];
    setTabs(loadedTabs);
    setActiveTabId(loadedTabs[0]?.id || 'tab-1');
    setSelectedNodeId(null);
    setTransform({ x: 0, y: 0, scale: 1 });
  };

  // 3. Salvar Automaticamente na Nuvem
  useEffect(() => {
    if (!currentMap || !user || tabs.length === 0) return;
    const saveTimer = setTimeout(async () => {
      setIsSaving(true);
      await supabase
        .from('maps')
        .update({ data: { tabs }, updated_at: new Date().toISOString() })
        .eq('id', currentMap.id);
      setIsSaving(false);
    }, 1200);

    return () => clearTimeout(saveTimer);
  }, [tabs, currentMap, user]);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0] || { nodes: [], connections: [] };

  // Atalho Tecla 'P' (Centralizar) e Tecla 'Delete'
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

  const handleDeleteSelected = useCallback(() => {
    if (!selectedNodeId) return;
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId
          ? {
              ...t,
              nodes: t.nodes.filter((n) => n.id !== selectedNodeId),
              connections: t.connections.filter(
                (c) => c.fromNodeId !== selectedNodeId && c.toNodeId !== selectedNodeId
              )
            }
          : t
      )
    );
    setSelectedNodeId(null);
  }, [selectedNodeId, activeTabId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInput = ['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable;
      if (isInput) return;

      if (e.key === 'p' || e.key === 'P') {
        handleResetView();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDeleteSelected();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleResetView, handleDeleteSelected]);

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

  // Gerenciamento de Nós
  const updateActiveTabData = (updater) => {
    setTabs((prev) => prev.map((t) => (t.id === activeTabId ? updater(t) : t)));
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
      updateActiveTabData((t) => ({
        ...t,
        nodes: t.nodes.map((n) => (n.id === selectedNodeId ? { ...n, image: imageDataUrl } : n))
      }));
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
          n.id === draggingNode.id ? { ...n, x: draggingNode.origX + dx, y: draggingNode.origY + dy } : n
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

  // Conexões Bézier
  const handlePortMouseDown = (e, nodeId, portIndex) => {
    e.stopPropagation();
    const node = activeTab.nodes.find((n) => n.id === nodeId);
    const pos = getPortPosition(node, portIndex);
    setConnecting({ fromNodeId: nodeId, fromPortIndex: portIndex, currentX: pos.x, currentY: pos.y });
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

  // Exportar JSON
  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(tabs, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `minddots-${(currentMap?.title || 'mapa').toLowerCase().replace(/\s+/g, '-')}.json`;
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
        onUpdateSelected={(patch) =>
          updateActiveTabData((t) => ({
            ...t,
            nodes: t.nodes.map((n) => (n.id === selectedNodeId ? { ...n, ...patch } : n))
          }))
        }
        onDeleteSelected={handleDeleteSelected}
        onResetView={handleResetView}
        onOpenMaps={() => setIsMapsOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        isAdmin={profile?.role === 'admin'}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={() => supabase.auth.signOut()}
        isSaving={isSaving}
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

            <div
              contentEditable
              suppressContentEditableWarning
              className="node-editor"
              onBlur={(e) => {
                const newText = e.currentTarget.innerText;
                updateActiveTabData((t) => ({
                  ...t,
                  nodes: t.nodes.map((n) => (n.id === node.id ? { ...n, text: newText } : n))
                }));
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {node.text}
            </div>
          </div>
        ))}
      </div>

      {/* A Barra de Abas SÓ APARECE se houver um mapa aberto */}
      {currentMap && (
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
      )}

      {/* Modais do Sistema */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={() => setIsAuthOpen(false)}
      />

      <ForcePasswordChangeModal
        isOpen={Boolean(profile?.must_change_password)}
        userId={user?.id}
        onSuccess={() => loadUserProfile(user?.id)}
      />

      <AdminPanel
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
      />

      <MapsManagerModal
        isOpen={isMapsOpen}
        onClose={() => setIsMapsOpen(false)}
        onSelectMap={handleSelectMap}
        userId={user?.id}
      />
    </div>
  );
}
