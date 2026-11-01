import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Shield, X, RotateCcw, CheckCircle, AlertTriangle, Users } from 'lucide-react';

export default function AdminPanel({ isOpen, onClose }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProfiles(data || []);
    } catch (err) {
      setError('Erro ao carregar usuários: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadProfiles();
      setMessage('');
      setError('');
    }
  }, [isOpen]);

  const handleApproveReset = async (userId, userName) => {
    if (!window.confirm(`Confirma autorizar o reset para ${userName}? A nova senha será 12345678.`)) return;

    try {
      const { data, error } = await supabase.rpc('admin_approve_reset', {
        target_user_id: userId
      });
      if (error) throw error;
      setMessage(`Sucesso! A senha de ${userName} agora é 12345678.`);
      loadProfiles();
    } catch (err) {
      setError(err.message || 'Erro ao redefinir a senha.');
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.5)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1500
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        padding: '28px',
        width: '100%',
        maxWidth: '620px',
        maxHeight: '85vh',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        border: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Topo do Modal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: '#EFF6FF', borderRadius: '10px', color: '#3B82F6' }}>
              <Shield size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1E293B', margin: 0 }}>
                Painel do Administrador
              </h2>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                Gerencie usuários e autorize redefinições de senha
              </span>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Mensagens de feedback */}
        {message && (
          <div style={{ background: '#DCFCE7', color: '#166534', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={16} /> {message}
          </div>
        )}
        {error && (
          <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px' }}>
            {error}
          </div>
        )}

        {/* Lista de Usuários */}
        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#64748B', fontSize: '14px' }}>Carregando usuários...</p>
          ) : profiles.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#64748B', fontSize: '14px' }}>Nenhum usuário cadastrado.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {profiles.map((user) => (
                <div
                  key={user.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: user.reset_requested ? '1.5px solid #F59E0B' : '1px solid #E2E8F0',
                    backgroundColor: user.reset_requested ? '#FFFBEB' : '#F8FAFC'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '14px', color: '#1E293B' }}>{user.name}</strong>
                      {user.role === 'admin' && (
                        <span style={{ fontSize: '10px', padding: '2px 6px', background: '#DBEAFE', color: '#1D4ED8', borderRadius: '4px', fontWeight: 600 }}>ADMIN</span>
                      )}
                      {user.reset_requested && (
                        <span style={{ fontSize: '11px', padding: '2px 8px', background: '#FDE68A', color: '#92400E', borderRadius: '6px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={12} /> Solicitou Redefinição
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{user.email}</div>
                  </div>

                  <button
                    onClick={() => handleApproveReset(user.id, user.name)}
                    style={{
                      background: user.reset_requested ? '#F59E0B' : '#FFFFFF',
                      color: user.reset_requested ? '#FFFFFF' : '#475569',
                      border: user.reset_requested ? 'none' : '1px solid #CBD5E1',
                      borderRadius: '8px',
                      padding: '7px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    title="Define a senha para 12345678"
                  >
                    <RotateCcw size={13} />
                    {user.reset_requested ? 'Autorizar Reset' : 'Resetar Senha'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
