import React, { useState, useRef, useEffect } from 'react';
import { Cloud, Check, Pencil } from 'lucide-react';

export default function UserProfileBadge({ user, profile, isSaving, onUpdateName }) {
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const lastTapRef = useRef(0);

  useEffect(() => {
    setNameInput(profile?.name || 'Usuário');
  }, [profile?.name]);

  if (!user) return null;

  const handleSave = () => {
    if (nameInput.trim() && nameInput.trim() !== profile?.name) {
      onUpdateName(nameInput.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setNameInput(profile?.name || 'Usuário');
      setIsEditing(false);
    }
  };

  // Sensor de Duplo Toque no Celular (Double Tap)
  const handleTouch = (e) => {
    if (isEditing) return;
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      e.stopPropagation();
      setIsEditing(true);
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;
  };

  return (
    <div className="user-badge-container">
      {/* Nuvem com status de salvamento em tempo real */}
      <span
        title={isSaving ? 'Salvando na nuvem...' : 'Salvo na nuvem'}
        style={{
          display: 'flex',
          alignItems: 'center',
          color: isSaving ? '#F59E0B' : '#10B981',
          transition: 'color 0.2s'
        }}
      >
        <Cloud size={15} />
      </span>

      {/* Campo de Edição ou Nome do Usuário */}
      {isEditing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <input
            type="text"
            value={nameInput}
            autoFocus
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#1E293B',
              border: '1.5px solid #2563EB',
              borderRadius: '6px',
              padding: '2px 8px',
              outline: 'none',
              width: '130px',
              background: '#FFFFFF'
            }}
          />
          <button
            onMouseDown={handleSave}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#10B981',
              cursor: 'pointer',
              display: 'flex',
              padding: '2px'
            }}
          >
            <Check size={16} />
          </button>
        </div>
      ) : (
        <div
          onDoubleClick={() => setIsEditing(true)}
          onTouchStart={handleTouch}
          title="Dois cliques para alterar seu nome"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer'
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
            {profile?.name || 'Usuário'}
          </span>
          <Pencil size={11} color="#94A3B8" style={{ opacity: 0.6 }} />
        </div>
      )}
    </div>
  );
}
