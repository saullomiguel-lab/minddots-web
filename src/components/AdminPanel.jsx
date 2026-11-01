import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Shield, X, RotateCcw, CheckCircle, AlertTriangle, Trash2, KeyRound, ShieldAlert } from 'lucide-react';

export default function AdminPanel({ isOpen, onClose }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Estados para redefinição da própria senha do Admin
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

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

  // 1. Autorizar Reset de Senha (para 12345678)
  const handleApproveReset = async (userId, userName) => {
    if (!window.confirm(`Confirma autorizar o reset para ${userName}? A senha temporária será 12345678.`)) return;
    try {
      const { data, error } = await supabase.rpc('admin_approve_reset', { target_user_id: userId });
      if (error) throw error;
      setMessage(`Senha de ${userName} resetada para 12345678 com sucesso!`);
      loadProfiles();
    } catch (err) {
      setError(err.message || 'Erro ao redefinir a senha.');
    }
  };

  // 2. Alternar Cargo (Promover a Admin ou Rebaixar)
  const handleToggleRole = async (userId, userName, currentRole) => {
    const action = currentRole === 'admin' ? 'rebaixar' : 'promover a Administrador';
    if (!window.confirm(`Tem certeza que deseja ${action} o usuário ${userName}?`)) return;

    try {
      const { data, error } = await supabase.rpc('admin_toggle_role', { target_user_id: userId });
      if (error) throw error;
      setMessage(data || 'Cargo atualizado com sucesso!');
      loadProfiles();
    } catch (err) {
      setError(err.message || 'Erro ao alterar cargo.');
    }
  };

  // 3. Excluir Usuário Permanentemente
  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`ATENÇÃO: Deseja realmente excluir ${userName}? Esta ação apagará a conta e todos os mapas do usuário.`)) return;

    try {
      const { data, error } = await supabase.rpc('admin_delete_user', { target_user_id: userId });
      if (error) throw error;
      setMessage(`Usuário ${userName} excluído com sucesso!`);
      loadProfiles();
    } catch (err) {
      setError(err.message || 'Erro ao excluir usuário.');
    }
  };

  // 4. Alterar a Própria Senha do Administrador
  const handleChangeAdminPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (adminNewPassword.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (adminNewPassword !== adminConfirmPassword) {
      setError('As senhas digitadas não coincidem.');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error: authError } = await supabase.auth.updateUser({
        password: adminNewPassword
      });
      if (authError) throw authError;

      setMessage('Sua senha de administrador foi alterada com sucesso!');
      setAdminNewPassword('');
      setAdminConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Erro ao alterar sua senha de administrador.');
    } finally {
      setPasswordLoading(false);
    }
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
      zIndex: 1500
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        padding: '28px',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        border: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Cabeçalho */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: '#EFF6FF', borderRadius: '10px', color: '#2563EB' }}>
              <Shield size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1E293B', margin: 0 }}>
                Painel do Administrador
              </h2>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                Gerencie permissões, senhas e usuários do MindDots
              </span>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Mensagens de Feedback */}
        {message && (
          <div style={{ background: '#DCFCE7', color: '#166534', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={16} /> {message}
          </div>
        )}
        {error && (
          <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '12px' }}>
            {error}
          </div>
        )}

        {/* Lista de Usuários */}
        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px', marginBottom: '16px' }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#64748B', fontSize: '14px', padding: '20px' }}>Carregando usuários...</p>
          ) : profiles.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#64748B', fontSize: '14px', padding: '20px' }}>Nenhum usuário cadastrado.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {profiles.map((u) => (
                <div
                  key={u.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: u.reset_requested ? '1.5px solid #F59E0B' : '1px solid #E2E8F0',
                    backgroundColor: u.reset_requested ? '#FFFBEB' : '#F8FAFC'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '14px', color: '#1E293B' }}>{u.name}</strong>
                      {u.role === 'admin' && (
                        <span style={{ fontSize: '10px', padding: '2px 6px', background: '#DBEAFE', color: '#1D4ED8', borderRadius: '4px', fontWeight: 600 }}>ADMIN</span>
                      )}
                      {u.reset_requested && (
                        <span style={{ fontSize: '11px', padding: '2px 8px', background: '#FDE68A', color: '#92400E', borderRadius: '6px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={12} /> Solicitou Reset
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{u.email}</div>
                  </div>

                  {/* Ações por Usuário */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {/* Botão Resetar Senha */}
                    <button
                      onClick={() => handleApproveReset(u.id, u.name)}
                      style={{
                        background: u.reset_requested ? '#F59E0B' : '#FFFFFF',
                        color: u.reset_requested ? '#FFFFFF' : '#475569',
                        border: u.reset_requested ? 'none' : '1px solid #CBD5E1',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Define a senha para 12345678"
                    >
                      <RotateCcw size={13} />
                      {u.reset_requested ? 'Autorizar' : 'Resetar'}
                    </button>

                    {/* Botão de Escudo (Alternar Admin) */}
                    <button
                      onClick={() => handleToggleRole(u.id, u.name, u.role)}
                      className="btn-icon"
                      style={{ color: u.role === 'admin' ? '#2563EB' : '#94A3B8', border: '1px solid #CBD5E1' }}
                      title={u.role === 'admin' ? 'Remover privilégio de Admin' : 'Tornar este usuário Administrador'}
                    >
                      {u.role === 'admin' ? <ShieldAlert size={15} /> : <Shield size={15} />}
                    </button>

                    {/* Botão Excluir Usuário */}
                    <button
                      onClick={() => handleDeleteUser(u.id, u.name)}
                      className="btn-icon"
                      style={{ color: '#EF4444', border: '1px solid #FCA5A5' }}
                      title="Excluir usuário e mapas permanentemente"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Seção: Alterar Minha Senha de Administrador */}
        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <KeyRound size={16} color="#2563EB" />
            <strong style={{ fontSize: '13px', color: '#1E293B' }}>Alterar Minha Senha de Administrador</strong>
          </div>
          <form onSubmit={handleChangeAdminPassword} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="password"
              placeholder="Nova Senha"
              required
              value={adminNewPassword}
              onChange={(e) => setAdminNewPassword(e.target.value)}
              style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
            />
            <input
              type="password"
              placeholder="Confirme a Senha"
              required
              value={adminConfirmPassword}
              onChange={(e) => setAdminConfirmPassword(e.target.value)}
              style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
            />
            <button
              type="submit"
              disabled={passwordLoading}
              style={{
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '0 14px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {passwordLoading ? 'Salvando...' : 'Salvar Senha'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
