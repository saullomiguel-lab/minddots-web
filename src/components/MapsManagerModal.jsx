import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { FolderOpen, Plus, Upload, Trash2, ArrowRight, X } from 'lucide-react';

export default function MapsManagerModal({ isOpen, onClose, onSelectMap, userId }) {
  const [mapsList, setMapsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMapTitle, setNewMapTitle] = useState('');
  const fileInputRef = useRef(null);

  const fetchMaps = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('maps')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setMapsList(data || []);
    } catch (err) {
      console.error('Erro ao carregar mapas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchMaps();
  }, [isOpen, userId]);

  const handleCreateNew = async (e) => {
    e.preventDefault();
    if (!newMapTitle.trim()) return;

    const initialData = {
      tabs: [{
        id: `tab-${Date.now()}`,
        title: 'Mapa 1',
        nodes: [{ id: `node-${Date.now()}`, x: 350, y: 250, text: newMapTitle.trim(), color: '#FFFFFF', fontSize: 16, align: 'center', image: null }],
        connections: []
      }]
    };

    const { data, error } = await supabase.from('maps').insert([{
      user_id: userId,
      title: newMapTitle.trim(),
      data: initialData
    }]).select().single();

    if (!error && data) {
      setNewMapTitle('');
      onSelectMap(data);
      onClose();
    }
  };

  // Importar JSON herdado do MindDots Desktop C#/WPF v1.07
  const handleImportJson = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        const title = file.name.replace('.json', '');
        
        // Adaptação se o JSON antigo veio em formato de abas ou mapa direto
        const finalData = Array.isArray(importedData) 
          ? { tabs: importedData } 
          : importedData.tabs 
            ? importedData 
            : { tabs: [{ id: 'tab-1', title: 'Principal', nodes: importedData.nodes || [], connections: importedData.connections || [] }] };

        const { data, error } = await supabase.from('maps').insert([{
          user_id: userId,
          title: title,
          data: finalData
        }]).select().single();

        if (!error && data) {
          onSelectMap(data);
          onClose();
        }
      } catch (err) {
        alert('Erro ao processar arquivo JSON do mapa mental.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDelete = async (mapId, e) => {
    e.stopPropagation();
    if (!window.confirm('Tem certeza que deseja excluir este mapa permanentemente?')) return;
    await supabase.from('maps').delete().eq('id', mapId);
    fetchMaps();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.55)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1200
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        padding: '28px',
        width: '100%',
        maxWidth: '540px',
        maxHeight: '85vh',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        border: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Topo */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: '#EFF6FF', borderRadius: '10px', color: '#3B82F6' }}>
              <FolderOpen size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1E293B', margin: 0 }}>Meus Mapas Mentais</h2>
              <span style={{ fontSize: '12px', color: '#64748B' }}>Abra um mapa ou crie um novo para liberar o Canvas</span>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Criar Novo e Importar */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <form onSubmit={handleCreateNew} style={{ display: 'flex', gap: '8px', flex: 1 }}>
            <input
              type="text"
              placeholder="Nome do novo mapa..."
              value={newMapTitle}
              onChange={(e) => setNewMapTitle(e.target.value)}
              style={{ flex: 1, padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
            />
            <button
              type="submit"
              style={{ background: '#3B82F6', color: '#FFF', border: 'none', borderRadius: '8px', padding: '0 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Plus size={16} /> Criar
            </button>
          </form>

          <button
            onClick={() => fileInputRef.current?.click()}
            title="Importar JSON do MindDots v1.07 Desktop"
            style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0 12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Upload size={15} /> Importar
          </button>
          <input type="file" ref={fileInputRef} onChange={handleImportJson} accept=".json" style={{ display: 'none' }} />
        </div>

        {/* Lista de Mapas */}
        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#64748B', fontSize: '13px', padding: '20px' }}>Carregando seus mapas...</p>
          ) : mapsList.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#64748B', fontSize: '13px', padding: '20px' }}>Você ainda não possui mapas criados.</p>
          ) : (
            mapsList.map((map) => (
              <div
                key={map.id}
                onClick={() => { onSelectMap(map); onClose(); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#F8FAFC',
                  cursor: 'pointer',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#EFF6FF'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
              >
                <div>
                  <strong style={{ fontSize: '14px', color: '#1E293B', display: 'block' }}>{map.title}</strong>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>{map.data?.tabs?.length || 1} aba(s)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={(e) => handleDelete(map.id, e)}
                    className="btn-icon"
                    title="Excluir Mapa"
                    style={{ color: '#EF4444' }}
                  >
                    <Trash2 size={16} />
                  </button>
                  <ArrowRight size={18} color="#3B82F6" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
