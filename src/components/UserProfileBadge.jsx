import React, { useState, useRef, useEffect } from 'react';
import { Cloud, Check, Pencil } from 'lucide-react';

export default function UserProfileBadge({ user, profile, isSaving, onUpdateName }) {
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const lastTapRef = useRef(0);

  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Sensor de Duplo Toque no Celular
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
        top: isMobile ? '64px' : '58px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: '#FFFFFF',
        border: '1.5px solid #CBD5E1',
        borderRadius: '9999px',
        padding: '3px 14px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        userSelect: 'none',
        pointerEvents: 'auto',
        whiteSpace: 'nowrap', // Impede que o texto quebre em duas linhas
        boxSizing: 'border-box'
      }}
    >
      {/* Nuvem com status de salvamento */}
      <span
        title={isSaving ? 'Salvando na nuvem...' : 'Salvo na nuvem'}
        style={{
          display: 'flex',
          alignItems: 'center',
          color: isSaving ? '#F59E0B' : '#10B981',
          transition: 'color 0.2s',
          flexShrink: 0
        }}
      >
        <Cloud size={14} />
      </span>

      {/* Campo de Edição ou Nome no Balãozinho */}
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
              border: 'none',
              outline: 'none',
              background: 'transparent',
              width: '110px',
              padding: 0
            }}
          />
          <button
            onMouseDown={handleSave}
            style={{
              background: '#10B981',
              border: 'none',
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              cursor: 'pointer',
              padding: 0,
              flexShrink: 0
            }}
          >
            <Check size={12} strokeWidth={3} />
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
            gap: '5px',
            cursor: 'pointer'
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
            {profile?.name || 'Usuário'}
          </span>
          <Pencil size={11} color="#94A3B8" style={{ opacity: 0.7 }} />
        </div>
      )}
    </div>
  );
}
