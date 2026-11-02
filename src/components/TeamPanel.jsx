import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Users, Plus, LogIn, LogOut, X, CheckCircle, AlertCircle, Trash2, Pencil, Check } from 'lucide-react';

export default function TeamPanel({ isOpen, onClose, profile, onProfileUpdate }) {
  const [mode, setMode] = useState('menu'); // 'menu' | 'create' | 'join'
  const [teamCode, setTeamCode] = useState('');
  const [currentTeamCode, setCurrentTeamCode] = useState('');
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [newCodeInput, setNewCodeInput] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMode('menu');
      setError('');
      setMessage('');
      setTeamCode('');
      setIsEditingCode(false);
      setNewCodeInput('');

      if (profile?.team_id) {
        supabase
          .from('teams')
          .select('code')
          .eq('id', profile.team_id)
          .single()
          .then(({ data }) => {
            if (data) setCurrentTeamCode(data.code);
          });
      }
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  // 1. Criar nova equipe
  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const cleanCode = teamCode.trim().toLowerCase();
    if (!/^[a-z0-9]+$/.test(cleanCode)) {
      setError('O código deve conter apenas letras minúsculas e números, sem espaços (ex: mkt2026).');
      return;
    }

    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('create_team', { team_code: cleanCode });
      if (rpcError) throw rpcError;
      if (data && data.startsWith('ERRO')) throw new Error(data);

      setMessage('Equipe criada com sucesso! Você é o administrador.');
      onProfileUpdate();
      setTimeout(() => setMode('menu'), 1800);
    } catch (err) {
      setError(err.message || 'Erro ao criar equipe.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Entrar em uma equipe existente
  const handleJoinTeam = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const { data, error: rpcError } = await supabase.rpc('join_team', { team_code: teamCode.trim().toLowerCase() });
      if (rpcError) throw rpcError;
      if (data && data.startsWith('ERRO')) throw new Error(data);

      setMessage('Você entrou na equipe com sucesso!');
      onProfileUpdate();
      setTimeout(() => setMode('menu'), 1800);
    } catch (err) {
      setError(err.message || 'Erro ao entrar na equipe.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Dono altera o código da equipe
  const handleUpdateCode = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const clean = newCodeInput.trim().toLowerCase();
    if (!/^[a-z0-9]+$/.test(clean)) {
      setError('O novo código deve conter apenas letras minúsculas e números, sem espaços.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('update_team_code', { new_code: clean });
      if (rpcError) throw rpcError;
      if (data && data.startsWith('ERRO')) throw new Error(data);

      setCurrentTeamCode(clean);
      setMessage('Código da equipe atualizado com sucesso!');
      setIsEditingCode(false);
      setNewCodeInput('');
      onProfileUpdate();
    } catch (err) {
      setError(err.message || 'Erro ao atualizar código.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Membro sai da equipe (NUNCA deleta a equipe)
  const handleLeaveTeam = async () => {
    if (!window.confirm('Tem certeza que deseja sair desta equipe? Você voltará a ser "Apenas Eu".')) return;

    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('leave_team');
      if (rpcError) throw rpcError;

      setMessage('Você saiu da equipe com sucesso!');
      onProfileUpdate();
    } catch (err) {
      setError(err.message || 'Erro ao sair da equipe.');
    } finally {
      setLoading(false);
    }
  };

  // 5. Dono exclui a equipe inteira
  const handleDeleteTeam = async () => {
    if (!window.confirm('ATENÇÃO: Deseja EXCLUIR sua equipe? Todos os membros serão desvinculados e você voltará a ser "Apenas Eu".')) return;

    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('delete_team');
      if (rpcError) throw rpcError;
      if (data && data.startsWith('ERRO')) throw new Error(data);

      setMessage('Equipe excluída com sucesso!');
      onProfileUpdate();
    } catch (err) {
      setError(err.message || 'Erro ao excluir equipe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.55)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1500, padding: '16px', boxSizing: 'border-box'
    }}>
      <div style={{
        background: '#FFFFFF', borderRadius: '20px',
        padding: '24px', width: '100%', maxWidth: '420px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        border: '1px solid #E2E8F0', boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column'
      }}>
        {/* Cabeçalho */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: '#EFF6FF', borderRadius: '10px', color: '#2563EB' }}>
              <Users size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1E293B', margin: 0 }}>
                Minha Equipe
              </h2>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                {profile?.team_id ? 'Gerencie sua equipe' : 'Crie ou participe de uma equipe'}
              </span>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        {error && (
          <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '10px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px', display: 'flex', gap: '6px' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
          </div>
        )}
        {message && (
          <div style={{ background: '#DCFCE7', color: '#166534', padding: '10px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px', display: 'flex', gap: '6px' }}>
            <CheckCircle size={16} style={{ flexShrink: 0 }} /> {message}
          </div>
        )}

        {/* ESTADO 1: Usuário já está em uma equipe */}
        {profile?.team_id ? (
          <div style={{ textAlign: 'center', padding: '6px 0' }}>
            
            {/* Bloco do Código da Equipe com botão de editar para o Dono */}
            <div style={{
              display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
              padding: '12px 20px', background: '#F8FAFC', borderRadius: '14px',
              border: '1.5px dashed #CBD5E1', marginBottom: '16px', minWidth: '220px'
            }}>
              <span style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                Código da Equipe
              </span>

              {isEditingCode ? (
                <form onSubmit={handleUpdateCode} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                  <input
                    type="text"
                    value={newCodeInput}
                    autoFocus
                    placeholder="Novo código..."
                    onChange={(e) => setNewCodeInput(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                    style={{
                      fontSize: '15px', fontWeight: 700, color: '#1E293B',
                      border: '1.5px solid #2563EB', borderRadius: '8px', padding: '4px 8px',
                      outline: 'none', width: '130px', textAlign: 'center'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    style={{ background: '#10B981', color: '#FFF', border: 'none', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    title="Salvar novo código"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingCode(false)}
                    style={{ background: '#E2E8F0', color: '#475569', border: 'none', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    title="Cancelar"
                  >
                    <X size={16} />
                  </button>
                </form>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '22px', fontWeight: 800, color: '#1E293B', letterSpacing: '1px' }}>
                    {currentTeamCode || '...'}
                  </span>
                  {profile?.is_team_owner && (
                    <button
                      onClick={() => { setIsEditingCode(true); setNewCodeInput(currentTeamCode); }}
                      style={{ background: 'transparent', border: 'none', color: '#2563EB', cursor: 'pointer', padding: '4px', display: 'flex' }}
                      title="Alterar código da equipe"
                    >
                      <Pencil size={15} />
                    </button>
                  )}
                </div>
              )}
            </div>

            <p style={{ fontSize: '13px', color: '#475569', marginBottom: '22px', lineHeight: '1.4' }}>
              {profile?.is_team_owner ? (
                <>Você é o <strong>Administrador desta equipe</strong>. Você pode alterar o código acima ou gerenciar membros no painel de administração.</>
              ) : (
                <>Você é um <strong>membro desta equipe</strong>. Seus mapas marcados com equipe estão disponíveis para seu administrador.</>
              )}
            </p>

            {/* Botão de Sair (Membro) ou Excluir (Dono) */}
            <button
              onClick={profile?.is_team_owner ? handleDeleteTeam : handleLeaveTeam}
              disabled={loading}
              style={{
                width: '100%', padding: '12px', borderRadius: '10px',
                border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#DC2626',
                fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              {profile?.is_team_owner ? <Trash2 size={18} /> : <LogOut size={18} />}
              {profile?.is_team_owner ? 'Excluir Minha Equipe' : 'Sair da Equipe'}
            </button>
          </div>
        ) : (
          /* ESTADO 2: Usuário "Apenas Eu" */
          mode === 'menu' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={() => { setMode('create'); setError(''); setMessage(''); setTeamCode(''); }}
                style={{
                  padding: '16px', borderRadius: '12px', border: '1.5px solid #2563EB',
                  background: '#EFF6FF', color: '#2563EB', fontWeight: 600, fontSize: '14px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px'
                }}
              >
                <div style={{ background: '#2563EB', color: '#FFF', padding: '6px', borderRadius: '8px' }}><Plus size={18} /></div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '15px' }}>Criar Nova Equipe</div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', fontWeight: 400 }}>Seja o dono e administre outros membros.</div>
                </div>
              </button>

              <button
                onClick={() => { setMode('join'); setError(''); setMessage(''); setTeamCode(''); }}
                style={{
                  padding: '16px', borderRadius: '12px', border: '1.5px solid #CBD5E1',
                  background: '#F8FAFC', color: '#334155', fontWeight: 600, fontSize: '14px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px'
                }}
              >
                <div style={{ background: '#E2E8F0', color: '#475569', padding: '6px', borderRadius: '8px' }}><LogIn size={18} /></div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '15px' }}>Entrar em uma Equipe</div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', fontWeight: 400 }}>Insira o código fornecido pelo seu administrador.</div>
                </div>
              </button>
            </div>
          ) : (
            /* Formulário para Criar ou Entrar */
            <form onSubmit={mode === 'create' ? handleCreateTeam : handleJoinTeam} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px dashed #CBD5E1' }}>
                <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: '1.4' }}>
                  {mode === 'create'
                    ? 'Escolha um código simples (só letras minúsculas e números, sem espaços). Ex: mkt2026'
                    : 'Digite o código da equipe que você deseja entrar.'}
                </p>
              </div>

              <input
                type="text"
                placeholder={mode === 'create' ? "Ex: equipevendas" : "Código da equipe"}
                required
                value={teamCode}
                onChange={(e) => setTeamCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                style={{ width: '100%', height: '46px', padding: '0 14px', borderRadius: '10px', border: '1.5px solid #2563EB', fontSize: '15px', fontWeight: 600, outline: 'none', boxSizing: 'border-box', background: '#F8FAFC' }}
              />

              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setMode('menu')}
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ flex: 2, padding: '12px', borderRadius: '10px', border: 'none', background: '#2563EB', color: '#FFFFFF', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 10px rgba(37,99,235,0.3)' }}
                >
                  {loading ? 'Aguarde...' : mode === 'create' ? 'Criar Equipe' : 'Entrar na Equipe'}
                </button>
              </div>
            </form>
          )
        )}
      </div>
    </div>
  );
}
