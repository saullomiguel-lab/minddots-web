import React, { useState, useRef, useEffect, useCallback } from 'react';
import Toolbar from './components/Toolbar';
import TabsBar from './components/TabsBar';
import MindNode from './components/MindNode';
import AuthModal from './components/AuthModal';
import ForcePasswordChangeModal from './components/ForcePasswordChangeModal';
import AdminPanel from './components/AdminPanel';
import MapsManagerModal from './components/MapsManagerModal';
import { getPortPosition, getBezierPath } from './constants';
import { exportMapToJpg, saveFileWithPicker } from './utils/exportHelper';
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
  const [selectedConnectionId, setSelectedConnectionId] = useState(null);
  const [clipboardNode, setClipboardNode] = useState(null);

  // Histórico Blindado
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

  // Encaixe 100% na Tela (Fit to Screen)
  const fitContentToScreen = useCallback((nodes) => {
    if (!nodes || nodes.length === 0) {
      setTransform({ x: 0, y: 0, scale: 1 });
      return;
    }

    const padding = 80;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    nodes.forEach((n) => {
      const w = n.width || 170;
      const h = n.height || 75;
      if (n.x < minX) minX = n.x;
      if (n.x + w > maxX) maxX = n.x + w;
      if (n.y < minY) minY = n.y;
      if (n.y + h > maxY) maxY = n.y + h;
    });

    const contentW = Math.max(maxX - minX, 120);
    const contentH = Math.max(maxY - minY, 80);

    const availableW = window.innerWidth - padding * 2;
    const availableH = window.innerHeight - padding * 2 - 60;

    const scaleX = availableW / contentW;
    const scaleY = availableH / contentH;
    const optimalScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.25), 1.15);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setTransform({
      x: window.innerWidth / 2 - centerX * optimalScale,
      y: window.innerHeight / 2 - centerY * optimalScale,
      scale: optimalScale
    });
  }, []);

  const handleSelectMap = useCallback((map) => {
    setCurrentMap(map);
    const loadedTabs = map.data?.tabs || [
      { id: 'tab-1', title: 'Mapa 1', nodes: [], connections: [] }
    ];
    setTabs(loadedTabs);
    setActiveTabId(loadedTabs[0]?.id || 'tab-1');
    setSelectedNodeId(null);
    setSelectedConnectionId(null);

    setHistory([JSON.parse(JSON.stringify(loadedTabs))]);
    setHistoryIndex(0);

    fitContentToScreen(loadedTabs[0]?.nodes || []);
  }, [fitContentToScreen]);

  const pushToHistory = useCallback((newTabs) => {
    if (!newTabs || !Array.isArray(newTabs)) return;
    setHistory((prev) => {
      const currentBranch = prev.slice(0, historyIndex + 1);
      return [...currentBranch, JSON.parse(JSON.stringify(newTabs))];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0 && history[historyIndex - 1]) {
      const newIdx = historyIndex - 1;
      const restored = JSON.parse(JSON.stringify(history[newIdx]));
      setTabs(restored);
      setHistoryIndex(newIdx);
      setSelectedNodeId(null);
      setSelectedConnectionId(null);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1 && history[historyIndex + 1]) {
      const newIdx = historyIndex + 1;
      const restored = JSON.parse(JSON.stringify(history[newIdx]));
      setTabs(restored);
      setHistoryIndex(newIdx);
      setSelectedNodeId(null);
      setSelectedConnectionId(null);
    }
  }, [history, historyIndex]);

  // Carga de Mapa Recente
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
          .insert([{ user_id: userId, title: 'Meu Primeiro Mapa', data: newMapData }])
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

  // Logout por Inatividade (1 hora)
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

  // Auto-salvamento na Nuvem
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

  const safeTabs = Array.isArray(tabs) ? tabs : [];
  const activeTab = safeTabs.find((t) => t.id === activeTabId) || safeTabs[0] || { nodes: [], connections: [] };

  const updateActiveTabData = (updater, recordHistory = false) => {
    const nextTabs = safeTabs.map((t) => (t.id === activeTabId ? updater(t) : t));
    setTabs(nextTabs);
    if (recordHistory) {
      pushToHistory(nextTabs);
    }
  };

  const handleHeightSync = (nodeId, actualHeight) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId
          ? {
              ...t,
              nodes: t.nodes.map((n) => (n.id === nodeId ? { ...n, height: actualHeight } : n))
            }
          : t
      )
    );
  };

  // Colar com Ctrl + V: Cria balão automático com imagem ou texto
  useEffect(() => {
    const handleGlobalPaste = (e) => {
      const isInput = ['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable;
      if (isInput) return;

      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      let foundImageFile = null;

      if (clipboardData.files && clipboardData.files.length > 0) {
        for (let i = 0; i < clipboardData.files.length; i++) {
          if (clipboardData.files[i].type.startsWith('image/')) {
            foundImageFile = clipboardData.files[i];
            break;
          }
        }
      }

      if (!foundImageFile && clipboardData.items) {
        for (let i = 0; i < clipboardData.items.length; i++) {
          if (clipboardData.items[i].type.startsWith('image/')) {
            foundImageFile = clipboardData.items[i].getAsFile();
            break;
          }
        }
      }

      let htmlImgSrc = null;
      if (!foundImageFile) {
        const html = clipboardData.getData('text/html');
        if (html) {
          const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
          if (match && match[1]) {
            htmlImgSrc = match[1];
          }
        }
      }

      const plainText = clipboardData.getData('text/plain') || '';
      let isImageUrl = false;
      if (!foundImageFile && !htmlImgSrc && plainText) {
        isImageUrl = /^https?:\/\/.*\.(jpeg|jpg|png|webp|gif|svg)($|\?)/i.test(plainText.trim()) || plainText.trim().startsWith('data:image/');
      }

      const createBalloonWithImage = (imgSrc) => {
        e.preventDefault();
        const newNode = {
          id: `node-${Date.now()}`,
          x: -transform.x + window.innerWidth / 2 - 100,
          y: -transform.y + window.innerHeight / 2 - 80,
          width: 200,
          height: 120,
          text: '',
          backgroundColor: '#FFFFFF',
          textColor: '#1E293B',
          fontSize: 14,
          textAlignment: 'Center',
          imageData: imgSrc
        };
        updateActiveTabData((t) => ({ ...t, nodes: [...t.nodes, newNode] }), true);
        setSelectedNodeId(newNode.id);
        setSelectedConnectionId(null);
      };

      if (foundImageFile) {
        const reader = new FileReader();
        reader.onload = (evt) => createBalloonWithImage(evt.target.result);
        reader.readAsDataURL(foundImageFile);
        return;
      }

      if (htmlImgSrc) {
        createBalloonWithImage(htmlImgSrc);
        return;
      }

      if (isImageUrl) {
        createBalloonWithImage(plainText.trim());
        return;
      }

      if (plainText && plainText.trim()) {
        e.preventDefault();
        const newNode = {
          id: `node-${Date.now()}`,
          x: -transform.x + window.innerWidth / 2 - 85,
          y: -transform.y + window.innerHeight / 2 - 37,
          width: 170,
          height: 75,
          text: plainText.trim(),
          backgroundColor: '#FFFFFF',
          textColor: '#1E293B',
          fontSize: 14,
          textAlignment: 'Left',
          imageData: null
        };
        updateActiveTabData((t) => ({ ...t, nodes: [...t.nodes, newNode] }), true);
        setSelectedNodeId(newNode.id);
        setSelectedConnectionId(null);
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [safeTabs, activeTabId, transform]);

  // Exclusão por Delete
  const handleDeleteSelected = useCallback(() => {
    if (selectedConnectionId) {
      updateActiveTabData((t) => ({
        ...t,
        connections: t.connections.filter((c) => c.id !== selectedConnectionId)
      }), true);
      setSelectedConnectionId(null);
      return;
    }

    if (selectedNodeId) {
      updateActiveTabData((t) => ({
        ...t,
        nodes: t.nodes.filter((n) => n.id !== selectedNodeId),
        connections: t.connections.filter(
          (c) => c.fromNodeId !== selectedNodeId && c.toNodeId !== selectedNodeId
        )
      }), true);
      setSelectedNodeId(null);
    }
  }, [selectedConnectionId, selectedNodeId, safeTabs, activeTabId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInput = ['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable;
      if (isInput) return;

      if (e.key === 'Escape') {
        if (connecting) setConnecting(null);
        setSelectedNodeId(null);
        setSelectedConnectionId(null);
        setIsPanning(false);
        setDraggingNode(null);
        setResizingNode(null);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'p' || e.key === 'P') {
        fitContentToScreen(activeTab.nodes);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDeleteSelected();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        const nodeToCopy = activeTab.nodes.find((n) => n.id === selectedNodeId);
        if (nodeToCopy) setClipboardNode({ ...nodeToCopy });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [connecting, fitContentToScreen, handleDeleteSelected, handleUndo, handleRedo, activeTab, selectedNodeId, selectedConnectionId, clipboardNode]);

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
    setSelectedConnectionId(null);
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
    setSelectedConnectionId(null);
  };

  const handleMouseDown = (e) => {
    if (e.target === containerRef.current || e.button === 1 || e.button === 2) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
      setSelectedNodeId(null);
      setSelectedConnectionId(null);
    }
  };

  // Início do arrasto para reconectar alças de uma linha existente
  const handleStartReanchor = (e, conn, end) => {
    e.stopPropagation();
    setDraggingNode(null);
    setResizingNode(null);

    const canvasMouseX = (e.clientX - transform.x) / transform.scale;
    const canvasMouseY = (e.clientY - transform.y) / transform.scale;

    if (end === 'to') {
      setConnecting({
        fromNodeId: conn.fromNodeId,
        fromPortIndex: conn.fromPortIndex,
        currentX: canvasMouseX,
        currentY: canvasMouseY,
        replaceConnectionId: conn.id,
        reanchorEnd: 'to'
      });
    } else {
      setConnecting({
        targetNodeId: conn.toNodeId,
        targetPortIndex: conn.toPortIndex,
        currentX: canvasMouseX,
        currentY: canvasMouseY,
        replaceConnectionId: conn.id,
        reanchorEnd: 'from'
      });
    }
  };

  // Monitoramento Global do Mouse
  useEffect(() => {
    const onWindowMouseMove = (e) => {
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
        const dir = resizingNode.direction;

        let newW = resizingNode.origW;
        let newH = resizingNode.origH;
        let newX = resizingNode.origX;
        let newY = resizingNode.origY;

        if (dir.includes('right')) newW = Math.max(120, resizingNode.origW + dx);
        if (dir.includes('left')) {
          newW = Math.max(120, resizingNode.origW - dx);
          newX = resizingNode.origX + (resizingNode.origW - newW);
        }
        if (dir.includes('bottom')) newH = Math.max(60, resizingNode.origH + dy);
        if (dir.includes('top')) {
          newH = Math.max(60, resizingNode.origH - dy);
          newY = resizingNode.origY + (resizingNode.origH - newH);
        }

        updateActiveTabData((t) => ({
          ...t,
          nodes: t.nodes.map((n) =>
            n.id === resizingNode.id ? { ...n, x: newX, y: newY, width: newW, height: newH } : n
          )
        }));
      } else if (connecting) {
        const canvasMouseX = (e.clientX - transform.x) / transform.scale;
        const canvasMouseY = (e.clientY - transform.y) / transform.scale;
        setConnecting((prev) => ({ ...prev, currentX: canvasMouseX, currentY: canvasMouseY }));
      }
    };

    const onWindowMouseUp = () => {
      if (draggingNode || resizingNode) {
        pushToHistory(safeTabs);
      }

      if (connecting && !connecting.connected) {
        const dropX = connecting.currentX;
        const dropY = connecting.currentY;

        if (connecting.reanchorEnd === 'from') {
          const originNode = activeTab.nodes.find((n) => {
            const w = n.width || 170;
            const h = n.height || 75;
            return dropX >= n.x - 15 && dropX <= n.x + w + 15 && dropY >= n.y - 15 && dropY <= n.y + h + 15;
          });

          if (originNode && originNode.id !== connecting.targetNodeId) {
            let bestPort = 0;
            let minDist = Infinity;
            [0, 1, 2, 3].forEach((pIdx) => {
              const pos = getPortPosition(originNode, pIdx);
              const d = Math.hypot(dropX - pos.x, dropY - pos.y);
              if (d < minDist) {
                minDist = d;
                bestPort = pIdx;
              }
            });

            const nextTabs = safeTabs.map((t) => {
              if (t.id !== activeTabId) return t;
              const filtered = t.connections.filter((c) => c.id !== connecting.replaceConnectionId);
              const newConn = {
                id: `conn-${Date.now()}`,
                fromNodeId: originNode.id,
                fromPortIndex: bestPort,
                toNodeId: connecting.targetNodeId,
                toPortIndex: connecting.targetPortIndex
              };
              return { ...t, connections: [...filtered, newConn] };
            });
            setTabs(nextTabs);
            pushToHistory(nextTabs);
          }
        } else {
          const targetNode = activeTab.nodes.find((n) => {
            if (n.id === connecting.fromNodeId) return false;
            const w = n.width || 170;
            const h = n.height || 75;
            return dropX >= n.x - 15 && dropX <= n.x + w + 15 && dropY >= n.y - 15 && dropY <= n.y + h + 15;
          });

          if (targetNode) {
            let bestPort = 0;
            let minDist = Infinity;
            [0, 1, 2, 3].forEach((pIdx) => {
              const pos = getPortPosition(targetNode, pIdx);
              const d = Math.hypot(dropX - pos.x, dropY - pos.y);
              if (d < minDist) {
                minDist = d;
                bestPort = pIdx;
              }
            });

            const nextTabs = safeTabs.map((t) => {
              if (t.id !== activeTabId) return t;
              const filtered = connecting.replaceConnectionId
                ? t.connections.filter((c) => c.id !== connecting.replaceConnectionId)
                : t.connections;
              const newConn = {
                id: `conn-${Date.now()}`,
                fromNodeId: connecting.fromNodeId,
                fromPortIndex: connecting.fromPortIndex,
                toNodeId: targetNode.id,
                toPortIndex: bestPort
              };
              return { ...t, connections: [...filtered, newConn] };
            });
            setTabs(nextTabs);
            pushToHistory(nextTabs);
          } else if (!connecting.replaceConnectionId) {
            const fromNode = activeTab.nodes.find((n) => n.id === connecting.fromNodeId);
            let bestToPort = 3;
            if (fromNode) {
              const parentCenterX = fromNode.x + (fromNode.width || 170) / 2;
              const parentCenterY = fromNode.y + (fromNode.height || 75) / 2;
              const dx = connecting.currentX - parentCenterX;
              const dy = connecting.currentY - parentCenterY;

              if (Math.abs(dy) > Math.abs(dx)) {
                bestToPort = dy > 0 ? 0 : 2;
              } else {
                bestToPort = dx > 0 ? 3 : 1;
              }
            }

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

            const newConn = {
              id: `conn-${Date.now()}`,
              fromNodeId: connecting.fromNodeId,
              fromPortIndex: connecting.fromPortIndex,
              toNodeId: newNode.id,
              toPortIndex: bestToPort
            };

            const nextTabs = safeTabs.map((t) =>
              t.id === activeTabId
                ? { ...t, nodes: [...t.nodes, newNode], connections: [...t.connections, newConn] }
                : t
            );
            setTabs(nextTabs);
            pushToHistory(nextTabs);
            setSelectedNodeId(newNode.id);
            setSelectedConnectionId(null);
          }
        }
      }

      setIsPanning(false);
      setDraggingNode(null);
      setResizingNode(null);
      setConnecting(null);
    };

    if (isPanning || draggingNode || resizingNode || connecting) {
      window.addEventListener('mousemove', onWindowMouseMove);
      window.addEventListener('mouseup', onWindowMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
    };
  }, [isPanning, draggingNode, resizingNode, connecting, transform, safeTabs, activeTab, activeTabId, pushToHistory]);

  const handlePortMouseDown = (e, nodeId, portIndex) => {
    setDraggingNode(null);
    setResizingNode(null);
    setSelectedConnectionId(null);

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

  // 1. EXPORTAR IMAGEM (JPG EM ALTA RESOLUÇÃO) COM "SALVAR COMO..."
  const handleExportImage = () => {
    const title = currentMap?.title || activeTab?.title || 'mapa-mental';
    exportMapToJpg(activeTab.nodes, activeTab.connections, title);
  };

  // 2. EXPORTAR ARQUIVO (JSON) COM "SALVAR COMO..."
  const handleExportFile = async () => {
    const title = (currentMap?.title || activeTab?.title || 'mapa-mental')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-');
    const dataStr = JSON.stringify(tabs, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    await saveFileWithPicker(blob, `${title}.json`, 'application/json', 'json');
  };

  const selectedNode = activeTab.nodes.find((n) => n.id === selectedNodeId);

  return (
    <div
      ref={containerRef}
      className={`canvas-container ${isPanning ? 'panning' : ''}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClickCanvas}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Toolbar
        onAddNode={handleAddNode}
        onExportImage={handleExportImage}
        onExportFile={handleExportFile}
        onAddImage={(img) => {
          if (selectedNodeId) {
            updateActiveTabData((t) => ({
              ...t,
              nodes: t.nodes.map((n) => (n.id === selectedNodeId ? { ...n, imageData: img } : n))
            }), true);
          }
        }}
        selectedNode={selectedNode || (selectedConnectionId ? { isConnection: true } : null)}
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
        onResetView={() => fitContentToScreen(activeTab.nodes)}
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

      {/* SVG Infinito com Conexões e Alças de Reconexão */}
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
            const isConnSelected = selectedConnectionId === conn.id;

            if (connecting?.replaceConnectionId === conn.id) return null;

            return (
              <g key={conn.id}>
                {/* Linha visível */}
                <path
                  d={getBezierPath(p1, p2)}
                  fill="none"
                  stroke={isConnSelected ? '#2563EB' : '#94A3B8'}
                  strokeWidth={isConnSelected ? 3.2 : 2}
                  strokeLinecap="round"
                  markerEnd={isConnSelected ? 'url(#arrow-drag)' : 'url(#arrow-fixed)'}
                  style={{ transition: 'stroke 0.15s, stroke-width 0.15s' }}
                />

                {/* Área ampla de clique */}
                <path
                  d={getBezierPath(p1, p2)}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={16}
                  style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedConnectionId(conn.id);
                    setSelectedNodeId(null);
                  }}
                />

                {/* Alças Interativas ao Selecionar Linha */}
                {isConnSelected && (
                  <>
                    <circle
                      cx={p2.x}
                      cy={p2.y}
                      r={7.5}
                      fill="#2563EB"
                      stroke="#FFFFFF"
                      strokeWidth={2}
                      style={{ cursor: 'crosshair', pointerEvents: 'auto' }}
                      onMouseDown={(e) => handleStartReanchor(e, conn, 'to')}
                      title="Arraste para mudar a extremidade ou ligar a outro balão"
                    />

                    <circle
                      cx={p1.x}
                      cy={p1.y}
                      r={6.5}
                      fill="#FFFFFF"
                      stroke="#2563EB"
                      strokeWidth={2}
                      style={{ cursor: 'crosshair', pointerEvents: 'auto' }}
                      onMouseDown={(e) => handleStartReanchor(e, conn, 'from')}
                      title="Arraste para mudar a origem da linha"
                    />
                  </>
                )}
              </g>
            );
          })}

          {connecting && (
            <path
              d={
                connecting.reanchorEnd === 'from'
                  ? getBezierPath(
                      { x: connecting.currentX, y: connecting.currentY },
                      getPortPosition(
                        activeTab.nodes.find((n) => n.id === connecting.targetNodeId),
                        connecting.targetPortIndex
                      )
                    )
                  : getBezierPath(
                      getPortPosition(
                        activeTab.nodes.find((n) => n.id === connecting.fromNodeId),
                        connecting.fromPortIndex
                      ),
                      { x: connecting.currentX, y: connecting.currentY }
                    )
              }
              fill="none"
              stroke="#2563EB"
              strokeWidth="2.5"
              strokeDasharray="5,5"
              markerEnd="url(#arrow-drag)"
            />
          )}
        </g>
      </svg>

      {/* Camada dos Balões */}
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
                setSelectedNodeId(id);
                setSelectedConnectionId(null);
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
              onHeightChange={handleHeightSync}
              onResizeStart={(e, id, direction) => {
                const targetNode = activeTab.nodes.find((n) => n.id === id);
                if (!targetNode) return;
                setResizingNode({
                  id,
                  direction,
                  startX: e.clientX,
                  startY: e.clientY,
                  origX: targetNode.x,
                  origY: targetNode.y,
                  origW: targetNode.width || 170,
                  origH: targetNode.height || 75
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
          tabs={safeTabs}
          activeTabId={activeTabId}
          onSelectTab={(id) => {
            setActiveTabId(id);
            setSelectedNodeId(null);
            setSelectedConnectionId(null);
          }}
          onAddTab={() => {
            const newId = `tab-${Date.now()}`;
            const newTab = {
              id: newId,
              title: `Mapa ${safeTabs.length + 1}`,
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
            const nextTabs = [...safeTabs, newTab];
            setTabs(nextTabs);
            pushToHistory(nextTabs);
            setActiveTabId(newId);
          }}
          onRenameTab={(id, title) => {
            const nextTabs = safeTabs.map((t) => (t.id === id ? { ...t, title } : t));
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
