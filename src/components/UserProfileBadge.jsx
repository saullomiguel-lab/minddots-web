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
    <div
      style={{
        position: 'fixed',
        top: '60px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 120,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: '#FFFFFF',
        border: '1.5px solid #CBD5E1',
        borderRadius: '9999px',
        padding: '5px 16px',
        boxShadow: '0 3px 12px rgba(0, 0, 0, 0.08)',
        userSelect: 'none',
        pointerEvents: 'auto',
        transition: 'all 0.15s ease'
      }}
    >
      {/* Nuvem com status de salvamento */}
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

      {/* Campo de Edição ou Nome no Balãozinho */}
      {isEditing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
              border: 'none',
              outline: 'none',
              background: 'transparent',
              width: '120px',
              padding: 0
            }}
          />
          <button
            onMouseDown={handleSave}
            style={{
              background: '#10B981',
              border: 'none',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              cursor: 'pointer',
              padding: 0
            }}
          >
            <Check size={12} strokeWidth={3} />
          </button>
        </div>
      ) : (
        <div
          onDoubleClick={() => setIsEditing(true)}
          onTouchStart={handleTouch}
          title="Dois cliques (ou 2 toques) para alterar seu nome"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer'
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>
            {profile?.name || 'Usuário'}
          </span>
          <Pencil size={11} color="#94A3B8" />
        </div>
      )}
    </div>
  );
}
