import React, { useState } from 'react';
import { Plus } from 'lucide-react';

export default function TabsBar({ tabs, activeTabId, onSelectTab, onAddTab, onRenameTab }) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const startRename = (tab, e) => {
    e.stopPropagation();
    setEditingId(tab.id);
    setEditTitle(tab.title);
  };

  const handleFinishRename = (id) => {
    if (editTitle.trim()) {
      onRenameTab(id, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <footer className="bottom-tabs">
      {tabs.map((tab) => (
        <div key={tab.id} style={{ display: 'flex', alignItems: 'center' }}>
          {editingId === tab.id ? (
            <input
              type="text"
              value={editTitle}
              autoFocus
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={() => handleFinishRename(tab.id)}
              onKeyDown={(e) => e.key === 'Enter' && handleFinishRename(tab.id)}
              style={{
                fontSize: '13px',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid #3B82F6',
                outline: 'none',
                width: '80px'
              }}
            />
          ) : (
            <button
              className={`tab-item ${activeTabId === tab.id ? 'active' : ''}`}
              onClick={() => onSelectTab(tab.id)}
              onDoubleClick={(e) => startRename(tab, e)}
              title="Dois cliques para renomear"
            >
              {tab.title}
            </button>
          )}
        </div>
      ))}

      <button className="btn-icon" title="Adicionar Novo Mapa" onClick={onAddTab}>
        <Plus size={16} />
      </button>
    </footer>
  );
}
