import React, { useState, useRef, useEffect, useCallback } from 'react';
import Toolbar from './components/Toolbar';
import TabsBar from './components/TabsBar';
import MindNode from './components/MindNode';
import AuthModal from './components/AuthModal';
import ForcePasswordChangeModal from './components/ForcePasswordChangeModal';
import AdminPanel from './components/AdminPanel';
import MapsManagerModal from './components/MapsManagerModal';
import TeamPanel from './components/TeamPanel';
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
    if (!window.confirm('Tem certeza que deseja excluir esta aba e seu conteúdo?')) return;
    const nextTabs = safeTabs.filter(t => t.id !== tabId);
    setTabs(nextTabs); pushToHistory(nextTabs);
    if (activeTabId === tabId) { setActiveTabId(nextTabs[0].id); fitContentToScreen(nextTabs[0].nodes); }
  }, [safeTabs, activeTabId, pushToHistory, fitContentToScreen]);

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

  return (
    <div ref={containerRef} className={`canvas-container ${isPanning ? 'panning' : ''}`} onWheel={handleWheel} onMouseDown={handleMouseDown} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onDoubleClick={handleDoubleClickCanvas} onContextMenu={(e) => e.preventDefault()}>
      <Toolbar 
        onAddNode={handleAddNode} onExportImage={handleExportImage} onExportFile={handleExportFile} 
        onAddImage={(img) => { if (selectedNodeId) { updateActiveTabData((t) => ({ ...t, nodes: t.nodes.map((n) => (n.id === selectedNodeId ? { ...n, imageData: img } : n)) }), true); } }}
        selectedNode={selectedNodeId ? activeTab.nodes.find(n => n.id === selectedNodeId) : (selectedConnectionId ? { isConnection: true } : null)}
        onUpdateSelected={(patch) => { updateActiveTabData((t) => ({ ...t, nodes: t.nodes.map((n) => { if (n.id !== selectedNodeId) return n; return { ...n, backgroundColor: patch.color !== undefined ? patch.color : n.backgroundColor, fontSize: patch.fontSize !== undefined ? patch.fontSize : n.fontSize, textAlignment: patch.align !== undefined ? patch.align : n.textAlignment }; }) }), true); }}
        onDeleteSelected={handleDeleteSelected} onResetView={() => fitContentToScreen(activeTab.nodes)}
        onOpenMaps={() => setIsMapsOpen(true)} onOpenAdmin={() => setIsAdminOpen(true)} onOpenTeam={() => setIsTeamOpen(true)}
        isAdmin={profile?.role === 'admin' || profile?.is_team_owner} user={user} onOpenAuth={() => setIsAuthOpen(true)} onLogout={() => supabase.auth.signOut()}
        isSaving={isSaving} onUndo={handleUndo} onRedo={handleRedo} canUndo={historyIndex > 0} canRedo={historyIndex < history.length - 1}
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
            return (
              <g key={conn.id} onClick={(e) => { e.stopPropagation(); setSelectedConnectionId(conn.id); setSelectedNodeId(null); }}>
                <path d={getBezierPath(p1, p2, conn)} fill="none" stroke={isConnSelected ? '#2563EB' : '#94A3B8'} strokeWidth={isConnSelected ? 3.2 : 2} markerEnd={isConnSelected ? 'url(#arrow-drag)' : 'url(#arrow-fixed)'} />
                <path d={getBezierPath(p1, p2, conn)} fill="none" stroke="transparent" strokeWidth={30} style={{ pointerEvents: 'stroke', cursor: 'pointer' }} />
              </g>
            );
          })}
        </g>
      </svg>
      <div style={{ position: 'absolute', top: 0, left: 0, transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: '0 0', pointerEvents: 'none' }}>
        {activeTab.nodes.map((node, index) => (
          <div key={node.id} style={{ pointerEvents: 'auto' }}>
            <MindNode node={node} isSelected={selectedNodeId === node.id} isRoot={index === 0} onSelect={(e, id) => { setSelectedNodeId(id); setSelectedConnectionId(null); }} onStartDrag={(pos, id) => setDraggingNode({ id, startX: pos.clientX, startY: pos.clientY, origX: node.x, origY: node.y })} onPortMouseDown={handlePortMouseDown} onHeightChange={handleHeightSync} onResizeStart={(pos, id, dir) => { const n = activeTab.nodes.find(x => x.id === id); setResizingNode({ id, direction: dir, startX: pos.clientX, startY: pos.clientY, origX: n.x, origY: n.y, origW: n.width || 170, origH: n.height || 75 }); }} onUpdateText={(id, text) => updateActiveTabData((t) => ({ ...t, nodes: t.nodes.map((n) => (n.id === id ? { ...n, text } : n)) }), true)} onPaste={(id, patch) => updateActiveTabData((t) => ({ ...t, nodes: t.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }), true)} />
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
