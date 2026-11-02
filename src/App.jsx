import React, { useState, useRef, useEffect, useCallback } from 'react';
import Toolbar from './components/Toolbar';
import TabsBar from './components/TabsBar';
import MindNode from './components/MindNode';
import AuthModal from './components/AuthModal';
import ForcePasswordChangeModal from './components/ForcePasswordChangeModal';
import AdminPanel from './components/AdminPanel';
import MapsManagerModal from './components/MapsManagerModal';
import TeamPanel from './components/TeamPanel';
import UserProfileBadge from './components/UserProfileBadge';
import { getPortPosition, getBezierPath, getBezierControlPoints } from './constants';
import { exportMapToJpg, saveFileWithPicker } from './utils/exportHelper';
import { supabase } from './supabaseClient';

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isMapsOpen, setIsMapsOpen] = useState(false);
  const [isTeamOpen, setIsTeamOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [currentMap, setCurrentMap] = useState(null);
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState(null);
  const [clipboardNode, setClipboardNode] = useState(null);

  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  const touchStateRef = useRef({ isTracking: false, lastX: 0, lastY: 0, startDist: 0, startScale: 1 });

  const [draggingNode, setDraggingNode] = useState(null);
  const [resizingNode, setResizingNode] = useState(null);
  const [connecting, setConnecting] = useState(null);
  const [draggingCP, setDraggingCP] = useState(null); 
  const containerRef = useRef(null);

  const loadUserProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(data || null);
  };

  const handleUpdateUserName = async (newName) => {
    if (!user || !newName.trim()) return;
    const cleanName = newName.trim();
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: cleanName })
        .eq('id', user.id);
      if (error) throw error;
      setProfile((prev) => (prev ? { ...prev, name: cleanName } : prev));
    } catch (err) {
      alert('Erro ao atualizar nome: ' + err.message);
    }
  };

  const fitContentToScreen = useCallback((nodes) => {
    if (!nodes || nodes.length === 0) { setTransform({ x: 0, y: 0, scale: 1 }); return; }
    const padding = 70;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach((n) => {
      const w = n.width || 170; const h = n.height || 75;
      if (n.x < minX) minX = n.x; if (n.x + w > maxX) maxX = n.x + w;
      if (n.y < minY) minY = n.y; if (n.y + h > maxY) maxY = n.y + h;
    });
    const contentW = Math.max(maxX - minX, 120); const contentH = Math.max(maxY - minY, 80);
    const availableW = window.innerWidth - padding * 2; const availableH = window.innerHeight - padding * 2 - 60;
    const scaleX = availableW / contentW; const scaleY = availableH / contentH;
    const optimalScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.25), 1.15);
    const centerX = (minX + maxX) / 2; const centerY = (minY + maxY) / 2;
    setTransform({ x: window.innerWidth / 2 - centerX * optimalScale, y: window.innerHeight / 2 - centerY * optimalScale, scale: optimalScale });
  }, []);

  const handleSelectMap = useCallback((map) => {
    setCurrentMap(map);
    const loadedTabs = map.data?.tabs || [{ id: 'tab-1', title: 'Mapa 1', nodes: [], connections: [] }];
    setTabs(loadedTabs); setActiveTabId(loadedTabs[0]?.id || 'tab-1');
    setSelectedNodeId(null); setSelectedConnectionId(null);
    setHistory([JSON.parse(JSON.stringify(loadedTabs))]); setHistoryIndex(0);
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
      const newIdx = historyIndex - 1; setTabs(JSON.parse(JSON.stringify(history[newIdx]))); setHistoryIndex(newIdx);
      setSelectedNodeId(null); setSelectedConnectionId(null);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1 && history[historyIndex + 1]) {
      const newIdx = historyIndex + 1; setTabs(JSON.parse(JSON.stringify(history[newIdx]))); setHistoryIndex(newIdx);
      setSelectedNodeId(null); setSelectedConnectionId(null);
    }
  }, [history, historyIndex]);

  const loadRecentOrCreateMap = useCallback(async (userId, profileData) => {
    try {
      const { data, error } = await supabase.from('maps').select('*').eq('user_id', userId).order('updated_at', { ascending: false }).limit(1);
      if (error) throw error;
      if (data && data.length > 0) { handleSelectMap(data[0]); } else {
        const newMapData = { tabs: [{ id: `tab-${Date.now()}`, title: 'Mapa 1', nodes: [{ id: `node-${Date.now()}`, x: 350, y: 220, width: 170, height: 75, text: '', backgroundColor: '#FFFFFF', textColor: '#1E293B', fontSize: 16, textAlignment: 'Center', imageData: null }], connections: [] }] };
        const { data: createdMap, error: createError } = await supabase.from('maps').insert([{ user_id: userId, title: 'Meu Primeiro Mapa', data: newMapData, team_id: profileData?.team_id || null }]).select().single();
        if (!createError && createdMap) { handleSelectMap(createdMap); }
      }
    } catch (err) { console.error('Erro ao carregar mapa recente:', err); }
  }, [handleSelectMap]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) {
        const { data: p } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        setProfile(p || null);
        loadRecentOrCreateMap(session.user.id, p);
      } else { setIsAuthOpen(true); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        const { data: p } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        setProfile(p || null);
        loadRecentOrCreateMap(session.user.id, p);
      } else { setProfile(null); setCurrentMap(null); setTabs([]); setIsAuthOpen(true); }
    });
    return () => subscription.unsubscribe();
  }, [loadRecentOrCreateMap]);

  useEffect(() => {
    if (!user) return;
    const ONE_HOUR = 60 * 60 * 1000;
    let inactivityTimer;
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(async () => { alert('Sua sessão expirou por inatividade. Entre novamente.'); await supabase.auth.signOut(); }, ONE_HOUR);
    };
    const events = ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart', 'scroll'];
    events.forEach((eventName) => window.addEventListener(eventName, resetTimer));
    resetTimer();
    return () => { clearTimeout(inactivityTimer); events.forEach((eventName) => window.removeEventListener(eventName, resetTimer)); };
  }, [user]);

  useEffect(() => {
    if (!currentMap || !user || tabs.length === 0) return;
    const saveTimer = setTimeout(async () => {
      setIsSaving(true); await supabase.from('maps').update({ data: { tabs }, updated_at: new Date().toISOString() }).eq('id', currentMap.id); setIsSaving(false);
    }, 1200);
    return () => clearTimeout(saveTimer);
  }, [tabs, currentMap, user]);

  const safeTabs = Array.isArray(tabs) ? tabs : [];
  const activeTab = safeTabs.find((t) => t.id === activeTabId) || safeTabs[0] || { nodes: [], connections: [] };

  const updateActiveTabData = (updater, recordHistory = false) => {
    const nextTabs = safeTabs.map((t) => (t.id === activeTabId ? updater(t) : t));
    setTabs(nextTabs);
    if (recordHistory) pushToHistory(nextTabs);
  };

  const handleHeightSync = (nodeId, actualHeight) => {
    setTabs((prev) => prev.map((t) => t.id === activeTabId ? { ...t, nodes: t.nodes.map((n) => (n.id === nodeId ? { ...n, height: actualHeight } : n)) } : t));
  };

  useEffect(() => {
    const handleGlobalPaste = (e) => {
      const isInput = ['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable;
      if (isInput) return;
      const clipboardData = e.clipboardData; if (!clipboardData) return;
      let foundImageFile = null;
      if (clipboardData.files && clipboardData.files.length > 0) {
        for (let i = 0; i < clipboardData.files.length; i++) { if (clipboardData.files[i].type.startsWith('image/')) { foundImageFile = clipboardData.files[i]; break; } }
      }
      if (!foundImageFile && clipboardData.items) {
        for (let i = 0; i < clipboardData.items.length; i++) { if (clipboardData.items[i].type.startsWith('image/')) { foundImageFile = clipboardData.items[i].getAsFile(); break; } }
      }
      let htmlImgSrc = null;
      if (!foundImageFile) {
        const html = clipboardData.getData('text/html');
        if (html) { const match = html.match(/<img[^>]+src=["']([^"']+)["']/i); if (match && match[1]) htmlImgSrc = match[1]; }
      }
      const plainText = clipboardData.getData('text/plain') || '';
      let isImageUrl = false;
      if (!foundImageFile && !htmlImgSrc && plainText) { isImageUrl = /^https?:\/\/.*\.(jpeg|jpg|png|webp|gif|svg)($|\?)/i.test(plainText.trim()) || plainText.trim().startsWith('data:image/'); }

      const createBalloonWithImage = (imgSrc) => {
        e.preventDefault();
        const newNode = { id: `node-${Date.now()}`, x: -transform.x + window.innerWidth / 2 - 100, y: -transform.y + window.innerHeight / 2 - 80, width: 200, height: 120, text: '', backgroundColor: '#FFFFFF', textColor: '#1E293B', fontSize: 14, textAlignment: 'Center', imageData: imgSrc };
        updateActiveTabData((t) => ({ ...t, nodes: [...t.nodes, newNode] }), true);
        setSelectedNodeId(newNode.id); setSelectedConnectionId(null);
      };

      if (foundImageFile) { const reader = new FileReader(); reader.onload = (evt) => createBalloonWithImage(evt.target.result); reader.readAsDataURL(foundImageFile); return; }
      if (htmlImgSrc) return createBalloonWithImage(htmlImgSrc);
      if (isImageUrl) return createBalloonWithImage(plainText.trim());
      if (plainText && plainText.trim()) {
        e.preventDefault();
        const newNode = { id: `node-${Date.now()}`, x: -transform.x + window.innerWidth / 2 - 85, y: -transform.y + window.innerHeight / 2 - 37, width: 170, height: 75, text: plainText.trim(), backgroundColor: '#FFFFFF', textColor: '#1E293B', fontSize: 14, textAlignment: 'Left', imageData: null };
        updateActiveTabData((t) => ({ ...t, nodes: [...t.nodes, newNode] }), true);
        setSelectedNodeId(newNode.id); setSelectedConnectionId(null);
      }
    };
    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [safeTabs, activeTabId, transform]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedConnectionId) {
      updateActiveTabData((t) => ({ ...t, connections: t.connections.filter((c) => c.id !== selectedConnectionId) }), true);
      setSelectedConnectionId(null); return;
    }
    if (selectedNodeId) {
      updateActiveTabData((t) => ({
        ...t, nodes: t.nodes.filter((n) => n.id !== selectedNodeId),
        connections: t.connections.filter((c) => c.fromNodeId !== selectedNodeId && c.toNodeId !== selectedNodeId)
      }), true);
      setSelectedNodeId(null);
    }
  }, [selectedConnectionId, selectedNodeId, safeTabs, activeTabId]);

  const handleDeleteTab = useCallback((tabId) => {
    if (safeTabs.length <= 1) { alert('Você não pode excluir a última aba do mapa.'); return; }
    const tabToDel = safeTabs.find(t => t.id === tabId);
    if (!window.confirm(`Tem certeza que deseja excluir a aba "${tabToDel?.title || 'Selecionada'}"?`)) return;
    const nextTabs = safeTabs.filter(t => t.id !== tabId);
    setTabs(nextTabs); pushToHistory(nextTabs);
    if (activeTabId === tabId) { setActiveTabId(nextTabs[0].id); fitContentToScreen(nextTabs[0].nodes); }
  }, [safeTabs, activeTabId, pushToHistory, fitContentToScreen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInput = ['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable;
      if (isInput) return;
      if (e.key === 'Escape') {
        if (connecting) setConnecting(null);
        setSelectedNodeId(null); setSelectedConnectionId(null); setIsPanning(false); setDraggingNode(null); setResizingNode(null); setDraggingCP(null);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault(); if (e.shiftKey) handleRedo(); else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault(); handleRedo();
      } else if (e.key === 'p' || e.key === 'P') {
        fitContentToScreen(activeTab.nodes);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId || selectedConnectionId) handleDeleteSelected(); else handleDeleteTab(activeTabId);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        const nodeToCopy = activeTab.nodes.find((n) => n.id === selectedNodeId);
        if (nodeToCopy) setClipboardNode({ ...nodeToCopy });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [connecting, fitContentToScreen, handleDeleteSelected, handleDeleteTab, handleUndo, handleRedo, activeTab, selectedNodeId, selectedConnectionId, clipboardNode, activeTabId]);

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const newScale = Math.min(Math.max(transform.scale * zoomFactor, 0.25), 3);
    const mouseX = e.clientX; const mouseY = e.clientY;
    const newX = mouseX - (mouseX - transform.x) * (newScale / transform.scale);
    const newY = mouseY - (mouseY - transform.y) * (newScale / transform.scale);
    setTransform({ x: newX, y: newY, scale: newScale });
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1 && e.target === containerRef.current) {
      touchStateRef.current.isTracking = true;
      touchStateRef.current.lastX = e.touches[0].clientX; touchStateRef.current.lastY = e.touches[0].clientY;
      setSelectedNodeId(null); setSelectedConnectionId(null);
    } else if (e.touches.length === 2) {
      touchStateRef.current.isTracking = false;
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      touchStateRef.current.startDist = dist; touchStateRef.current.startScale = transform.scale;
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && touchStateRef.current.isTracking) {
      const dx = e.touches[0].clientX - touchStateRef.current.lastX; const dy = e.touches[0].clientY - touchStateRef.current.lastY;
      touchStateRef.current.lastX = e.touches[0].clientX; touchStateRef.current.lastY = e.touches[0].clientY;
      setTransform((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    } else if (e.touches.length === 2 && touchStateRef.current.startDist > 0) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const factor = dist / touchStateRef.current.startDist;
      const newScale = Math.min(Math.max(touchStateRef.current.startScale * factor, 0.25), 3);
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2; const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      setTransform((prev) => {
        const newX = midX - (midX - prev.x) * (newScale / prev.scale); const newY = midY - (midY - prev.y) * (newScale / prev.scale);
        return { x: newX, y: newY, scale: newScale };
      });
    }
  };

  const handleTouchEnd = () => { touchStateRef.current.isTracking = false; touchStateRef.current.startDist = 0; };

  const handleDoubleClickCanvas = (e) => {
    if (e.target !== containerRef.current) return;
    const canvasX = (e.clientX - transform.x) / transform.scale; const canvasY = (e.clientY - transform.y) / transform.scale;
    const newNode = { id: `node-${Date.now()}`, x: canvasX - 85, y: canvasY - 37, width: 170, height: 75, text: '', backgroundColor: '#FFFFFF', textColor: '#1E293B', fontSize: 14, textAlignment: 'Left', imageData: null };
    updateActiveTabData((t) => ({ ...t, nodes: [...t.nodes, newNode] }), true);
    setSelectedNodeId(newNode.id); setSelectedConnectionId(null);
  };

  const handleAddNode = () => {
    const newNode = { id: `node-${Date.now()}`, x: -transform.x + window.innerWidth / 2 - 85, y: -transform.y + window.innerHeight / 2 - 37, width: 170, height: 75, text: '', backgroundColor: '#FFFFFF', textColor: '#1E293B', fontSize: 14, textAlignment: 'Left', imageData: null };
    updateActiveTabData((t) => ({ ...t, nodes: [...t.nodes, newNode] }), true);
    setSelectedNodeId(newNode.id); setSelectedConnectionId(null);
  };

  const handleMouseDown = (e) => {
    if (e.target === containerRef.current || e.button === 1 || e.button === 2) {
      setIsPanning(true); panStartRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
      setSelectedNodeId(null); setSelectedConnectionId(null);
    }
  };

  const handleStartReanchor = (e, conn, end) => {
    if (e.stopPropagation) e.stopPropagation();
    setDraggingNode(null); setResizingNode(null); setDraggingCP(null);
    const canvasMouseX = (e.clientX - transform.x) / transform.scale; const canvasMouseY = (e.clientY - transform.y) / transform.scale;
    if (end === 'to') setConnecting({ fromNodeId: conn.fromNodeId, fromPortIndex: conn.fromPortIndex, currentX: canvasMouseX, currentY: canvasMouseY, replaceConnectionId: conn.id, reanchorEnd: 'to' });
    else setConnecting({ targetNodeId: conn.toNodeId, targetPortIndex: conn.toPortIndex, currentX: canvasMouseX, currentY: canvasMouseY, replaceConnectionId: conn.id, reanchorEnd: 'from' });
  };

  const handleStartDragCP = (e, conn, cpIndex) => {
    if (e.stopPropagation) e.stopPropagation();
    setDraggingNode(null); setResizingNode(null); setConnecting(null);
    setDraggingCP({ connId: conn.id, cpIndex });
  };

  const handleResetCurve = (e, connId) => {
    if (e.stopPropagation) e.stopPropagation();
    updateActiveTabData((t) => ({ ...t, connections: t.connections.map((c) => c.id === connId ? { ...c, cp1Offset: null, cp2Offset: null } : c) }), true);
  };

  useEffect(() => {
    const onPointerMove = (clientX, clientY) => {
      if (isPanning) {
        setTransform((prev) => ({ ...prev, x: clientX - panStartRef.current.x, y: clientY - panStartRef.current.y }));
      } else if (draggingNode) {
        const dx = (clientX - draggingNode.startX) / transform.scale; const dy = (clientY - draggingNode.startY) / transform.scale;
        updateActiveTabData((t) => ({ ...t, nodes: t.nodes.map((n) => n.id === draggingNode.id ? { ...n, x: draggingNode.origX + dx, y: draggingNode.origY + dy } : n) }));
      } else if (resizingNode) {
        const dx = (clientX - resizingNode.startX) / transform.scale; const dy = (clientY - resizingNode.startY) / transform.scale; const dir = resizingNode.direction;
        let newW = resizingNode.origW, newH = resizingNode.origH, newX = resizingNode.origX, newY = resizingNode.origY;
        if (dir.includes('right')) newW = Math.max(120, resizingNode.origW + dx);
        if (dir.includes('left')) { newW = Math.max(120, resizingNode.origW - dx); newX = resizingNode.origX + (resizingNode.origW - newW); }
        if (dir.includes('bottom')) newH = Math.max(60, resizingNode.origH + dy);
        if (dir.includes('top')) { newH = Math.max(60, resizingNode.origH - dy); newY = resizingNode.origY + (resizingNode.origH - newH); }
        updateActiveTabData((t) => ({ ...t, nodes: t.nodes.map((n) => n.id === resizingNode.id ? { ...n, x: newX, y: newY, width: newW, height: newH } : n) }));
      } else if (connecting) {
        const canvasMouseX = (clientX - transform.x) / transform.scale; const canvasMouseY = (clientY - transform.y) / transform.scale;
        setConnecting((prev) => ({ ...prev, currentX: canvasMouseX, currentY: canvasMouseY }));
      } else if (draggingCP) {
        const canvasMouseX = (clientX - transform.x) / transform.scale; const canvasMouseY = (clientY - transform.y) / transform.scale;
        updateActiveTabData((t) => ({
          ...t, connections: t.connections.map((c) => {
            if (c.id !== draggingCP.connId) return c;
            const fromNode = t.nodes.find((n) => n.id === c.fromNodeId); const toNode = t.nodes.find((n) => n.id === c.toNodeId);
            if (!fromNode || !toNode) return c;
            const p1 = getPortPosition(fromNode, c.fromPortIndex); const p2 = getPortPosition(toNode, c.toPortIndex);
            let cp1Off = c.cp1Offset; let cp2Off = c.cp2Offset;
            if (!cp1Off || !cp2Off) { const autoCps = getBezierControlPoints(p1, p2); cp1Off = { dx: autoCps.cp1.x - p1.x, dy: autoCps.cp1.y - p1.y }; cp2Off = { dx: autoCps.cp2.x - p2.x, dy: autoCps.cp2.y - p2.y }; }
            if (draggingCP.cpIndex === 1) { cp1Off = { dx: canvasMouseX - p1.x, dy: canvasMouseY - p1.y }; } else { cp2Off = { dx: canvasMouseX - p2.x, dy: canvasMouseY - p2.y }; }
            return { ...c, cp1Offset: cp1Off, cp2Offset: cp2Off };
          })
        }));
      }
    };

    const onPointerUp = () => {
      if (draggingNode || resizingNode || draggingCP) { pushToHistory(safeTabs); }
      if (connecting && !connecting.connected) {
        const dropX = connecting.currentX; const dropY = connecting.currentY;
        if (connecting.reanchorEnd === 'from') {
          const originNode = activeTab.nodes.find((n) => { const w = n.width || 170; const h = n.height || 75; return dropX >= n.x - 24 && dropX <= n.x + w + 24 && dropY >= n.y - 24 && dropY <= n.y + h + 24; });
          if (originNode && originNode.id !== connecting.targetNodeId) {
            let bestPort = 0; let minDist = Infinity;
            [0, 1, 2, 3].forEach((pIdx) => { const pos = getPortPosition(originNode, pIdx); const d = Math.hypot(dropX - pos.x, dropY - pos.y); if (d < minDist) { minDist = d; bestPort = pIdx; } });
            const nextTabs = safeTabs.map((t) => {
              if (t.id !== activeTabId) return t;
              const filtered = t.connections.filter((c) => c.id !== connecting.replaceConnectionId);
              const newConn = { id: `conn-${Date.now()}`, fromNodeId: originNode.id, fromPortIndex: bestPort, toNodeId: connecting.targetNodeId, toPortIndex: connecting.targetPortIndex };
              return { ...t, connections: [...filtered, newConn] };
            });
            setTabs(nextTabs); pushToHistory(nextTabs);
          }
        } else {
          const targetNode = activeTab.nodes.find((n) => { if (n.id === connecting.fromNodeId) return false; const w = n.width || 170; const h = n.height || 75; return dropX >= n.x - 24 && dropX <= n.x + w + 24 && dropY >= n.y - 24 && dropY <= n.y + h + 24; });
          if (targetNode) {
            let bestPort = 0; let minDist = Infinity;
            [0, 1, 2, 3].forEach((pIdx) => { const pos = getPortPosition(targetNode, pIdx); const d = Math.hypot(dropX - pos.x, dropY - pos.y); if (d < minDist) { minDist = d; bestPort = pIdx; } });
            const nextTabs = safeTabs.map((t) => {
              if (t.id !== activeTabId) return t;
              const filtered = connecting.replaceConnectionId ? t.connections.filter((c) => c.id !== connecting.replaceConnectionId) : t.connections;
              const newConn = { id: `conn-${Date.now()}`, fromNodeId: connecting.fromNodeId, fromPortIndex: connecting.fromPortIndex, toNodeId: targetNode.id, toPortIndex: bestPort };
              return { ...t, connections: [...filtered, newConn] };
            });
            setTabs(nextTabs); pushToHistory(nextTabs);
          } else if (!connecting.replaceConnectionId) {
            const fromNode = activeTab.nodes.find((n) => n.id === connecting.fromNodeId);
            let bestToPort = 3;
            if (fromNode) {
              const parentCenterX = fromNode.x + (fromNode.width || 170) / 2; const parentCenterY = fromNode.y + (fromNode.height || 75) / 2;
              const dx = connecting.currentX - parentCenterX; const dy = connecting.currentY - parentCenterY;
              if (Math.abs(dy) > Math.abs(dx)) { bestToPort = dy > 0 ? 0 : 2; } else { bestToPort = dx > 0 ? 3 : 1; }
            }
            const newNodeW = 170; const newNodeH = 75;
            const newNode = { id: `node-${Date.now()}`, x: connecting.currentX - newNodeW / 2, y: connecting.currentY - newNodeH / 2, width: newNodeW, height: newNodeH, text: '', backgroundColor: '#FFFFFF', textColor: '#1E293B', fontSize: 14, textAlignment: 'Left', imageData: null };
            const newConn = { id: `conn-${Date.now()}`, fromNodeId: connecting.fromNodeId, fromPortIndex: connecting.fromPortIndex, toNodeId: newNode.id, toPortIndex: bestToPort };
            const nextTabs = safeTabs.map((t) => t.id === activeTabId ? { ...t, nodes: [...t.nodes, newNode], connections: [...t.connections, newConn] } : t);
            setTabs(nextTabs); pushToHistory(nextTabs); setSelectedNodeId(newNode.id); setSelectedConnectionId(null);
          }
        }
      }
      setIsPanning(false); setDraggingNode(null); setResizingNode(null); setConnecting(null); setDraggingCP(null);
    };

    const onWindowMouseMove = (e) => onPointerMove(e.clientX, e.clientY);
    const onWindowMouseUp = () => onPointerUp();
    const onWindowTouchMove = (e) => { if (e.touches && e.touches.length > 0) { const touch = e.touches[0]; onPointerMove(touch.clientX, touch.clientY); if (draggingNode || connecting || resizingNode || draggingCP) { if (e.cancelable) e.preventDefault(); } } };
    const onWindowTouchEnd = () => onPointerUp();

    if (isPanning || draggingNode || resizingNode || connecting || draggingCP) {
      window.addEventListener('mousemove', onWindowMouseMove); window.addEventListener('mouseup', onWindowMouseUp);
      window.addEventListener('touchmove', onWindowTouchMove, { passive: false }); window.addEventListener('touchend', onWindowTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove); window.removeEventListener('mouseup', onWindowMouseUp);
      window.removeEventListener('touchmove', onWindowTouchMove); window.removeEventListener('touchend', onWindowTouchEnd);
    };
  }, [isPanning, draggingNode, resizingNode, connecting, draggingCP, transform, safeTabs, activeTab, activeTabId, pushToHistory]);

  const handlePortMouseDown = (e, nodeId, portIndex) => {
    setDraggingNode(null); setResizingNode(null); setSelectedConnectionId(null); setDraggingCP(null);
    const node = activeTab.nodes.find((n) => n.id === nodeId);
    const pos = getPortPosition(node, portIndex);
    setConnecting({ fromNodeId: nodeId, fromPortIndex: portIndex, currentX: pos.x, currentY: pos.y, connected: false });
  };

  const handlePortMouseUp = () => {};

  const handleExportImage = () => {
    const userName = profile?.name ? profile.name.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'usuario';
    const mapTitle = (currentMap?.title || activeTab?.title || 'mapa-mental').toLowerCase().replace(/[^a-z0-9]/g, '-');
    const now = new Date();
    const timestamp = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
    exportMapToJpg(activeTab.nodes, activeTab.connections, `${userName}_${mapTitle}_${timestamp}`);
  };

  const handleExportFile = async () => {
    const userName = profile?.name ? profile.name.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'usuario';
    const mapTitle = (currentMap?.title || activeTab?.title || 'mapa-mental').toLowerCase().replace(/[^a-z0-9]/g, '-');
    const now = new Date();
    const timestamp = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
    const dataStr = JSON.stringify(tabs, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    await saveFileWithPicker(blob, `${userName}_${mapTitle}_${timestamp}.json`, 'application/json', 'json');
  };

  const selectedNode = activeTab.nodes.find((n) => n.id === selectedNodeId);
  const isUserAdminOrTeamOwner = profile?.role === 'admin' || profile?.is_team_owner;

  return (
    <div ref={containerRef} className={`canvas-container ${isPanning ? 'panning' : ''}`} onWheel={handleWheel} onMouseDown={handleMouseDown} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onDoubleClick={handleDoubleClickCanvas} onContextMenu={(e) => e.preventDefault()}>
      <Toolbar 
        onAddNode={handleAddNode} onExportImage={handleExportImage} onExportFile={handleExportFile} 
        onAddImage={(img) => { if (selectedNodeId) { updateActiveTabData((t) => ({ ...t, nodes: t.nodes.map((n) => (n.id === selectedNodeId ? { ...n, imageData: img } : n)) }), true); } }}
        selectedNode={selectedNode || (selectedConnectionId ? { isConnection: true } : null)}
        onUpdateSelected={(patch) => { updateActiveTabData((t) => ({ ...t, nodes: t.nodes.map((n) => { if (n.id !== selectedNodeId) return n; return { ...n, backgroundColor: patch.color !== undefined ? patch.color : n.backgroundColor, fontSize: patch.fontSize !== undefined ? patch.fontSize : n.fontSize, textAlignment: patch.align !== undefined ? patch.align : n.textAlignment }; }) }), true); }}
        onDeleteSelected={handleDeleteSelected} onResetView={() => fitContentToScreen(activeTab.nodes)}
        onOpenMaps={() => setIsMapsOpen(true)} onOpenAdmin={() => setIsAdminOpen(true)} onOpenTeam={() => setIsTeamOpen(true)}
        isAdmin={isUserAdminOrTeamOwner} user={user} onOpenAuth={() => setIsAuthOpen(true)} onLogout={() => supabase.auth.signOut()}
        isSaving={isSaving} onUndo={handleUndo} onRedo={handleRedo} canUndo={historyIndex > 0} canRedo={historyIndex < history.length - 1}
      />

      {/* Crachá com o Nome do Usuário Centralizado e a Nuvem ao Lado */}
      <UserProfileBadge
        user={user}
        profile={profile}
        isSaving={isSaving}
        onUpdateName={handleUpdateUserName}
      />

      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
        <defs>
          <marker id="arrow-fixed" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#94A3B8" /></marker>
          <marker id="arrow-drag" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#2563EB" /></marker>
        </defs>
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {activeTab.connections.map((conn) => {
            const fromNode = activeTab.nodes.find((n) => n.id === conn.fromNodeId); const toNode = activeTab.nodes.find((n) => n.id === conn.toNodeId);
            if (!fromNode || !toNode) return null;
            const p1 = getPortPosition(fromNode, conn.fromPortIndex); const p2 = getPortPosition(toNode, conn.toPortIndex);
            const isConnSelected = selectedConnectionId === conn.id;
            if (connecting?.replaceConnectionId === conn.id) return null;
            return (
              <g key={conn.id}>
                <path d={getBezierPath(p1, p2, conn)} fill="none" stroke={isConnSelected ? '#2563EB' : '#94A3B8'} strokeWidth={isConnSelected ? 3.2 : 2} strokeLinecap="round" markerEnd={isConnSelected ? 'url(#arrow-drag)' : 'url(#arrow-fixed)'} />
                <path d={getBezierPath(p1, p2, conn)} fill="none" stroke="transparent" strokeWidth={30} style={{ pointerEvents: 'stroke', cursor: 'pointer', touchAction: 'none' }} onClick={(e) => { e.stopPropagation(); setSelectedConnectionId(conn.id); setSelectedNodeId(null); }} onTouchStart={(e) => { e.stopPropagation(); setSelectedConnectionId(conn.id); setSelectedNodeId(null); }} />
                {isConnSelected && (() => {
                  const { cp1, cp2 } = getBezierControlPoints(p1, p2, conn);
                  const midX = 0.125 * p1.x + 0.375 * cp1.x + 0.375 * cp2.x + 0.125 * p2.x;
                  const midY = 0.125 * p1.y + 0.375 * cp1.y + 0.375 * cp2.y + 0.125 * p2.y;
                  return (
                    <g>
                      <line x1={p1.x} y1={p1.y} x2={cp1.x} y2={cp1.y} stroke="#3B82F6" strokeWidth={1.5} strokeDasharray="4,4" opacity="0.6" />
                      <line x1={p2.x} y1={p2.y} x2={cp2.x} y2={cp2.y} stroke="#3B82F6" strokeWidth={1.5} strokeDasharray="4,4" opacity="0.6" />
                      <circle cx={cp1.x} cy={cp1.y} r={22} fill="transparent" style={{ cursor: 'move', pointerEvents: 'auto', touchAction: 'none' }} onMouseDown={(e) => handleStartDragCP(e, conn, 1)} onTouchStart={(e) => { const t = e.touches[0]; handleStartDragCP({ clientX: t.clientX, clientY: t.clientY, stopPropagation: () => e.stopPropagation() }, conn, 1); }} />
                      <circle cx={cp1.x} cy={cp1.y} r={7} fill="#FFFFFF" stroke="#3B82F6" strokeWidth={2.5} pointerEvents="none" />
                      <circle cx={cp2.x} cy={cp2.y} r={22} fill="transparent" style={{ cursor: 'move', pointerEvents: 'auto', touchAction: 'none' }} onMouseDown={(e) => handleStartDragCP(e, conn, 2)} onTouchStart={(e) => { const t = e.touches[0]; handleStartDragCP({ clientX: t.clientX, clientY: t.clientY, stopPropagation: () => e.stopPropagation() }, conn, 2); }} />
                      <circle cx={cp2.x} cy={cp2.y} r={7} fill="#FFFFFF" stroke="#3B82F6" strokeWidth={2.5} pointerEvents="none" />
                      {(conn.cp1Offset || conn.cp2Offset) && (
                        <g>
                          <circle cx={midX} cy={midY} r={18} fill="transparent" style={{ cursor: 'pointer', pointerEvents: 'auto' }} onMouseDown={(e) => handleResetCurve(e, conn.id)} onTouchStart={(e) => handleResetCurve(e, conn.id)} />
                          <circle cx={midX} cy={midY} r={6} fill="#EF4444" stroke="#FFFFFF" strokeWidth={2} pointerEvents="none" />
                        </g>
                      )}
                    </g>
                  );
                })()}
                {isConnSelected && (
                  <>
                    <g>
                      <circle cx={p2.x} cy={p2.y} r={24} fill="transparent" style={{ cursor: 'crosshair', pointerEvents: 'auto', touchAction: 'none' }} onMouseDown={(e) => handleStartReanchor(e, conn, 'to')} onTouchStart={(e) => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); const t = e.touches[0]; handleStartReanchor({ clientX: t.clientX, clientY: t.clientY, stopPropagation: () => e.stopPropagation() }, conn, 'to'); }} />
                      <circle cx={p2.x} cy={p2.y} r={8} fill="#2563EB" stroke="#FFFFFF" strokeWidth={2.5} pointerEvents="none" />
                    </g>
                    <g>
                      <circle cx={p1.x} cy={p1.y} r={24} fill="transparent" style={{ cursor: 'crosshair', pointerEvents: 'auto', touchAction: 'none' }} onMouseDown={(e) => handleStartReanchor(e, conn, 'from')} onTouchStart={(e) => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); const t = e.touches[0]; handleStartReanchor({ clientX: t.clientX, clientY: t.clientY, stopPropagation: () => e.stopPropagation() }, conn, 'from'); }} />
                      <circle cx={p1.x} cy={p1.y} r={7} fill="#FFFFFF" stroke="#2563EB" strokeWidth={2.5} pointerEvents="none" />
                    </g>
                  </>
                )}
              </g>
            );
          })}
          {connecting && (<path d={connecting.reanchorEnd === 'from' ? getBezierPath({ x: connecting.currentX, y: connecting.currentY }, getPortPosition(activeTab.nodes.find((n) => n.id === connecting.targetNodeId), connecting.targetPortIndex)) : getBezierPath(getPortPosition(activeTab.nodes.find((n) => n.id === connecting.fromNodeId), connecting.fromPortIndex), { x: connecting.currentX, y: connecting.currentY })} fill="none" stroke="#2563EB" strokeWidth={2.5} strokeDasharray="5,5" markerEnd="url(#arrow-drag)" />)}
        </g>
      </svg>
      <div style={{ position: 'absolute', top: 0, left: 0, transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: '0 0', pointerEvents: 'none' }}>
        {activeTab.nodes.map((node, index) => (
          <div key={node.id} style={{ pointerEvents: 'auto' }}>
            <MindNode node={node} isSelected={selectedNodeId === node.id} isRoot={index === 0} onSelect={(e, id) => { setSelectedNodeId(id); setSelectedConnectionId(null); }} onStartDrag={(pos, id) => setDraggingNode({ id, startX: pos.clientX, startY: pos.clientY, origX: node.x, origY: node.y })} onPortMouseDown={handlePortMouseDown} onPortMouseUp={handlePortMouseUp} onHeightChange={handleHeightSync} onResizeStart={(pos, id, dir) => { const n = activeTab.nodes.find(x => x.id === id); setResizingNode({ id, direction: dir, startX: pos.clientX, startY: pos.clientY, origX: n.x, origY: n.y, origW: n.width || 170, origH: n.height || 75 }); }} onUpdateText={(id, text) => updateActiveTabData((t) => ({ ...t, nodes: t.nodes.map((n) => (n.id === id ? { ...n, text } : n)) }), true)} onPaste={(id, patch) => updateActiveTabData((t) => ({ ...t, nodes: t.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }), true)} />
          </div>
        ))}
      </div>
      {currentMap && <TabsBar tabs={safeTabs} activeTabId={activeTabId} onSelectTab={(id) => { setActiveTabId(id); setSelectedNodeId(null); setSelectedConnectionId(null); }} onAddTab={() => { const newId = `tab-${Date.now()}`; const newTab = { id: newId, title: `Mapa ${safeTabs.length + 1}`, nodes: [{ id: `node-${Date.now()}`, x: 350, y: 220, width: 170, height: 75, text: '', backgroundColor: '#FFFFFF', textColor: '#1E293B', fontSize: 16, textAlignment: 'Center', imageData: null }], connections: [] }; const nextTabs = [...safeTabs, newTab]; setTabs(nextTabs); pushToHistory(nextTabs); setActiveTabId(newId); }} onRenameTab={(id, title) => { const nextTabs = safeTabs.map((t) => (t.id === id ? { ...t, title } : t)); setTabs(nextTabs); pushToHistory(nextTabs); }} onDeleteTab={handleDeleteTab} />}
      <AuthModal isOpen={isAuthOpen} onClose={() => user && setIsAuthOpen(false)} onAuthSuccess={() => setIsAuthOpen(false)} />
      <ForcePasswordChangeModal isOpen={Boolean(profile?.must_change_password)} userId={user?.id} onSuccess={() => loadUserProfile(user?.id)} />
      <AdminPanel isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} onSelectMap={(map) => handleSelectMap(map)} />
      <TeamPanel isOpen={isTeamOpen} onClose={() => setIsTeamOpen(false)} profile={profile} onProfileUpdate={() => loadUserProfile(user?.id)} />
      <MapsManagerModal isOpen={isMapsOpen} onClose={() => setIsMapsOpen(false)} onSelectMap={handleSelectMap} userId={user?.id} />
    </div>
  );
}
