import React, { useState, useRef, useEffect, useCallback } from 'react';
import Toolbar from './components/Toolbar';
import TabsBar from './components/TabsBar';
import MindNode from './components/MindNode';
import AuthModal from './components/AuthModal';
import ForcePasswordChangeModal from './components/ForcePasswordChangeModal';
import AdminPanel from './components/AdminPanel';
import MapsManagerModal from './components/MapsManagerModal';
import { getPortPosition, getBezierPath } from './constants';
import { supabase } from './supabaseClient';

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isMapsOpen, setIsMapsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [currentMap, setCurrentMap] = useState(null);
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [clipboardNode, setClipboardNode] = useState(null);

  // Histórico de Desfazer (Ctrl+Z) e Refazer (Ctrl+Y)
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Pan & Zoom
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Arrastos e Redimensionamentos
  const [draggingNode, setDraggingNode] = useState(null);
  const [resizingNode, setResizingNode] = useState(null);
  const [connecting, setConnecting] = useState(null);
  const containerRef = useRef(null);

  const loadUserProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(data || null);
  };

  // Centraliza o mapa na tela de acordo com os nós
  const centerMapNodes = useCallback((nodes) => {
    if (nodes && nodes.length > 0) {
      const avgX = nodes.reduce((acc, n) => acc + (n.x + (n.width || 170) / 2), 0) / nodes.length;
      const avgY = nodes.reduce((acc, n) => acc + (n.y + (n.height || 75) / 2), 0) / nodes.length;
      setTransform({
        x: window.innerWidth / 2 - avgX,
        y: window.innerHeight / 2 - avgY,
        scale: 1
      });
    } else {
      setTransform({ x: 0, y: 0, scale: 1 });
    }
  }, []);

  const handleSelectMap = useCallback((map) => {
    setCurrentMap(map);
    const loadedTabs = map.data?.tabs || [
      { id: 'tab-1', title: 'Mapa 1', nodes: [], connections: [] }
    ];
    setTabs(loadedTabs);
    setActiveTabId(loadedTabs[0]?.id || 'tab-1');
    setSelectedNodeId(null);

    // Inicializa o histórico de Desfazer
    setHistory([loadedTabs]);
    setHistoryIndex(0);

    // Centraliza automaticamente ao abrir!
    centerMapNodes(loadedTabs[0]?.nodes || []);
  }, [centerMapNodes]);

  // Grava uma nova etapa no histórico
  const pushToHistory = useCallback((newTabs) => {
    setHistory((prev) => {
      const currentBranch = prev.slice(0, historyIndex + 1);
      return [...currentBranch, newTabs];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      setTabs(history[newIdx]);
      setHistoryIndex(newIdx);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIdx = historyIndex + 1;
      setTabs(history[newIdx]);
      setHistoryIndex(newIdx);
    }
  }, [history, historyIndex]);

  // 1. Abre o mapa recente ou cria novo ao logar
  const loadRecentOrCreateMap = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('maps')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        handleSelectMap(data[0]);
      } else {
        const newMapData = {
          tabs: [
            {
              id: `tab-${Date.now()}`,
              title: 'Mapa 1',
              nodes: [
                {
                  id: `node-${Date.now()}`,
                  x: 350,
                  y: 220,
                  width: 170,
                  height: 75,
                  text: '',
                  backgroundColor: '#FFFFFF',
                  textColor: '#1E293B',
                  fontSize: 16,
                  textAlignment: 'Center',
                  imageData: null
                }
              ],
              connections: []
            }
          ]
        };

        const { data: createdMap, error: createError } = await supabase
          .from('maps')
          .insert([
            {
              user_id: userId,
              title: 'Meu Primeiro Mapa',
              data: newMapData
            }
          ])
          .select()
          .single();

        if (!createError && createdMap) {
          handleSelectMap(createdMap);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar mapa recente:', err);
    }
  }, [handleSelectMap]);

  // 2. Monitoramento de Sessão
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) {
        loadUserProfile(session.user.id);
        loadRecentOrCreateMap(session.user.id);
      } else {
        setIsAuthOpen(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        loadUserProfile(session.user.id);
        loadRecentOrCreateMap(session.user.id);
      } else {
        setProfile(null);
        setCurrentMap(null);
        setTabs([]);
        setIsAuthOpen(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadRecentOrCreateMap]);

  // 3. Logout por 1 hora de inatividade
  useEffect(() => {
    if (!user) return;
    const ONE_HOUR = 60 * 60 * 1000;
    let inactivityTimer;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(async () => {
        alert('Sua sessão expirou por inatividade (1 hora sem uso). Por favor, entre novamente.');
        await supabase.auth.signOut();
      }, ONE_HOUR);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart', 'scroll'];
    events.forEach((eventName) => window.addEventListener(eventName, resetTimer));

    resetTimer();

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
    };
  }, [user]);

  // 4. Auto-salvamento na nuvem
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

  const updateActiveTabData = (updater, recordHistory = false) => {
    setTabs((prev) => {
      const nextTabs = prev.map((t) => (t.id === activeTabId ? updater(t) : t));
      if (recordHistory) pushToHistory(nextTabs);
      return nextTabs;
    });
  };

  // Atalhos de teclado (P, Delete, Ctrl+C, Ctrl+V, Ctrl+Z, Ctrl+Y)
  const handleResetView = useCallback(() => {
    centerMapNodes(activeTab.nodes);
  }, [centerMapNodes, activeTab.nodes]);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedNodeId) return;
    updateActiveTabData((t) => ({
      ...t,
      nodes: t.nodes.filter((n) => n.id !== selectedNodeId),
      connections: t.connections.filter(
        (c) => c.fromNodeId !== selectedNodeId && c.toNodeId !== selectedNodeId
      )
    }), true);
    setSelectedNodeId(null);
  }, [selectedNodeId, activeTabId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInput = ['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable;
      if (isInput) return;

      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'p' || e.key === 'P') {
        handleResetView();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDeleteSelected();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        const nodeToCopy = activeTab.nodes.find((n) => n.id === selectedNodeId);
        if (nodeToCopy) setClipboardNode({ ...nodeToCopy });
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        if (clipboardNode) {
          const newNode = {
            ...clipboardNode,
            id: `node-${Date.now()}`,
            x: clipboardNode.x + 40,
            y: clipboardNode.y + 40
          };
          updateActiveTabData((t) => ({ ...t, nodes: [...t.nodes, newNode] }), true);
          setSelectedNodeId(newNode.id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleResetView, handleDeleteSelected, handleUndo, handleRedo, activeTab, selectedNodeId, clipboardNode]);

  // Zoom
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

  // Duplo clique no vazio: cria nó onde clicou
  const handleDoubleClickCanvas = (e) => {
    if (e.target !== containerRef.current) return;
    const canvasX = (e.clientX - transform.x) / transform.scale;
    const canvasY = (e.clientY - transform.y) / transform.scale;

    const newNode = {
      id: `node-${Date.now()}`,
      x: canvasX - 85,
      y: canvasY - 37,
      width: 170,
      height: 75,
      text: '',
      backgroundColor: '#FFFFFF',
      textColor: '#1E293B',
      fontSize: 14,
      textAlignment: 'Left',
      imageData: null
    };

    updateActiveTabData((t) => ({ ...t, nodes: [...t.nodes, newNode] }), true);
    setSelectedNodeId(newNode.id);
  };

  const handleAddNode = () => {
    const newNode = {
      id: `node-${Date.now()}`,
      x: -transform.x + window.innerWidth / 2 - 85,
      y: -transform.y + window.innerHeight / 2 - 37,
      width: 170,
      height: 75,
      text: '',
      backgroundColor: '#FFFFFF',
      textColor: '#1E293B',
      fontSize: 14,
      textAlignment: 'Left',
      imageData: null
    };
    updateActiveTabData((t) => ({ ...t, nodes: [...t.nodes, newNode] }), true);
    setSelectedNodeId(newNode.id);
  };

  // Iniciar Pan
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
    } else if (resizingNode) {
      const dx = (e.clientX - resizingNode.startX) / transform.scale;
      const dy = (e.clientY - resizingNode.startY) / transform.scale;
      updateActiveTabData((t) => ({
        ...t,
        nodes: t.nodes.map((n) =>
          n.id === resizingNode.id
            ? {
                ...n,
                width: Math.max(120, resizingNode.origW + dx),
                height: Math.max(60, resizingNode.origH + dy)
              }
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
    if (draggingNode || resizingNode) {
      pushToHistory(tabs);
    }

    // Soltar linha no vazio: cria nó conectado com direção de porta inteligente
    if (connecting && !connecting.connected) {
      const newNodeW = 170;
      const newNodeH = 75;
      const newNode = {
        id: `node-${Date.now()}`,
        x: connecting.currentX - newNodeW / 2,
        y: connecting.currentY - newNodeH / 2,
        width: newNodeW,
        height: newNodeH,
        text: '',
        backgroundColor: '#FFFFFF',
        textColor: '#1E293B',
        fontSize: 14,
        textAlignment: 'Left',
        imageData: null
      };

      // Porta de entrada correta: se saiu da esquerda (3), entra na direita (1) do filho!
      let bestToPort = 3;
      if (connecting.fromPortIndex === 3) bestToPort = 1;
      else if (connecting.fromPortIndex === 1) bestToPort = 3;
      else if (connecting.fromPortIndex === 0) bestToPort = 2;
      else if (connecting.fromPortIndex === 2) bestToPort = 0;

      const newConn = {
        id: `conn-${Date.now()}`,
        fromNodeId: connecting.fromNodeId,
        fromPortIndex: connecting.fromPortIndex,
        toNodeId: newNode.id,
        toPortIndex: bestToPort
      };

      const nextTabs = tabs.map((t) =>
        t.id === activeTabId
          ? { ...t, nodes: [...t.nodes, newNode], connections: [...t.connections, newConn] }
          : t
      );
      setTabs(nextTabs);
      pushToHistory(nextTabs);
      setSelectedNodeId(newNode.id);
    }

    setIsPanning(false);
    setDraggingNode(null);
    setResizingNode(null);
    setConnecting(null);
  };

  const handlePortMouseDown = (e, nodeId, portIndex) => {
    e.stopPropagation();
    const node = activeTab.nodes.find((n) => n.id === nodeId);
    const pos = getPortPosition(node, portIndex);
    setConnecting({
      fromNodeId: nodeId,
      fromPortIndex: portIndex,
      currentX: pos.x,
      currentY: pos.y,
      connected: false
    });
  };

  const handlePortMouseUp = (e, toNodeId, toPortIndex) => {
    e.stopPropagation();
    if (connecting && connecting.fromNodeId !== toNodeId) {
      const alreadyExists = activeTab.connections.some(
        (c) =>
          (c.fromNodeId === connecting.fromNodeId && c.toNodeId === toNodeId) ||
          (c.fromNodeId === toNodeId && c.toNodeId === connecting.fromNodeId)
      );

      if (!alreadyExists) {
        const newConn = {
          id: `conn-${Date.now()}`,
          fromNodeId: connecting.fromNodeId,
          fromPortIndex: connecting.fromPortIndex,
          toNodeId,
          toPortIndex
        };
        const nextTabs = tabs.map((t) =>
          t.id === activeTabId ? { ...t, connections: [...t.connections, newConn] } : t
        );
        setTabs(nextTabs);
        pushToHistory(nextTabs);
      }
      setConnecting((prev) => ({ ...prev, connected: true }));
    }
  };

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
      onDoubleClick={handleDoubleClickCanvas}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Toolbar
        onAddNode={handleAddNode}
        onExport={handleExport}
        onAddImage={(img) => {
          if (selectedNodeId) {
            updateActiveTabData((t) => ({
              ...t,
              nodes: t.nodes.map((n) => (n.id === selectedNodeId ? { ...n, imageData: img } : n))
            }), true);
          }
        }}
        selectedNode={selectedNode}
        onUpdateSelected={(patch) => {
          updateActiveTabData((t) => ({
            ...t,
            nodes: t.nodes.map((n) => {
              if (n.id !== selectedNodeId) return n;
              return {
                ...n,
                backgroundColor: patch.color !== undefined ? patch.color : n.backgroundColor,
                fontSize: patch.fontSize !== undefined ? patch.fontSize : n.fontSize,
                textAlignment: patch.align !== undefined ? patch.align : n.textAlignment
              };
            })
          }), true);
        }}
        onDeleteSelected={handleDeleteSelected}
        onResetView={handleResetView}
        onOpenMaps={() => setIsMapsOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        isAdmin={profile?.role === 'admin'}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={() => supabase.auth.signOut()}
        isSaving={isSaving}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
      />

      {/* SVG Infinito com Orientação de Seta Perfeita e Sem Cortes */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          overflow: 'visible'
        }}
      >
        <defs>
          <marker id="arrow-fixed" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#94A3B8" />
          </marker>
          <marker id="arrow-drag" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#2563EB" />
          </marker>
        </defs>

        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
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
                strokeWidth="2"
                strokeLinecap="round"
                markerEnd="url(#arrow-fixed)"
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
              stroke="#2563EB"
              strokeWidth="2.5"
              strokeDasharray="5,5"
              markerEnd="url(#arrow-drag)"
            />
          )}
        </g>
      </svg>

      {/* Camada Infinita dos Balões com Transparência de Cliques */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: '0 0',
          pointerEvents: 'none'
        }}
      >
        {activeTab.nodes.map((node, index) => (
          <div key={node.id} style={{ pointerEvents: 'auto' }}>
            <MindNode
              node={node}
              isSelected={selectedNodeId === node.id}
              isRoot={index === 0}
              onSelect={(e, id) => {
                e.stopPropagation();
                setSelectedNodeId(id);
              }}
              onStartDrag={(e, id) => {
                setDraggingNode({
                  id,
                  startX: e.clientX,
                  startY: e.clientY,
                  origX: node.x,
                  origY: node.y
                });
              }}
              onPortMouseDown={handlePortMouseDown}
              onPortMouseUp={handlePortMouseUp}
              onResizeStart={(e, id) => {
                e.stopPropagation();
                setResizingNode({
                  id,
                  startX: e.clientX,
                  startY: e.clientY,
                  origW: node.width || 170,
                  origH: node.height || 75
                });
              }}
              onUpdateText={(id, text) => {
                updateActiveTabData((t) => ({
                  ...t,
                  nodes: t.nodes.map((n) => (n.id === id ? { ...n, text } : n))
                }), true);
              }}
              onPaste={(id, patch) => {
                updateActiveTabData((t) => ({
                  ...t,
                  nodes: t.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n))
                }), true);
              }}
            />
          </div>
        ))}
      </div>

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
              nodes: [
                {
                  id: `node-${Date.now()}`,
                  x: 350,
                  y: 220,
                  width: 170,
                  height: 75,
                  text: '',
                  backgroundColor: '#FFFFFF',
                  textColor: '#1E293B',
                  fontSize: 16,
                  textAlignment: 'Center',
                  imageData: null
                }
              ],
              connections: []
            };
            const nextTabs = [...tabs, newTab];
            setTabs(nextTabs);
            pushToHistory(nextTabs);
            setActiveTabId(newId);
          }}
          onRenameTab={(id, title) => {
            const nextTabs = tabs.map((t) => (t.id === id ? { ...t, title } : t));
            setTabs(nextTabs);
            pushToHistory(nextTabs);
          }}
        />
      )}

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => user && setIsAuthOpen(false)}
        onAuthSuccess={() => setIsAuthOpen(false)}
      />

      <ForcePasswordChangeModal
        isOpen={Boolean(profile?.must_change_password)}
        userId={user?.id}
        onSuccess={() => loadUserProfile(user?.id)}
      />

      <AdminPanel isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />

      <MapsManagerModal
        isOpen={isMapsOpen}
        onClose={() => setIsMapsOpen(false)}
        onSelectMap={handleSelectMap}
        userId={user?.id}
      />
    </div>
  );
}
