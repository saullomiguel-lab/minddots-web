import React from 'react';
import { Clock, LogOut, CheckCircle2 } from 'lucide-react';

export default function InactivityModal({ isOpen, countdown, onStay, onLogout }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3000,
      padding: '16px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: '20px',
        padding: '28px 24px',
        width: '100%',
        maxWidth: '380px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #E2E8F0',
        textAlign: 'center',
        boxSizing: 'border-box',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        {/* Ícone de Relógio em Destaque */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '54px',
          height: '54px',
          background: '#FEF3C7',
          color: '#D97706',
          borderRadius: '50%',
          marginBottom: '14px'
        }}>
          <Clock size={28} />
        </div>

        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1E293B', margin: '0 0 6px 0' }}>
          Você ainda está aí?
        </h2>

        <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.4', margin: '0 0 16px 0' }}>
          Você está inativo há mais de 30 minutos. Por segurança, sua sessão será encerrada automaticamente em:
        </p>

        {/* Contador Regressivo em Segundos */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: '#EFF6FF',
          border: '2px solid #3B82F6',
          color: '#2563EB',
          fontSize: '22px',
          fontWeight: 800,
          marginBottom: '20px'
        }}>
          {countdown}s
        </div>

        {/* Botões: Permanecer ou Sair */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onLogout}
            style={{
              flex: 1,
              height: '44px',
              borderRadius: '10px',
              border: '1.5px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#64748B',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <LogOut size={16} /> Sair
          </button>

          <button
            onClick={onStay}
            style={{
              flex: 1.4,
              height: '44px',
              borderRadius: '10px',
              border: 'none',
              background: '#2563EB',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <CheckCircle2 size={16} /> Permanecer
          </button>
        </div>
      </div>
    </div>
  );
}
