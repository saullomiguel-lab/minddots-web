import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Users, Plus, LogIn, LogOut, X, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';

export default function TeamPanel({ isOpen, onClose, profile, onProfileUpdate }) {
  const [mode, setMode] = useState('menu'); // 'menu' | 'create' | 'join'
  const [teamCode, setTeamCode] = useState('');
  const [currentTeamCode, setCurrentTeamCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Busca o nome do código da equipe atual, se o usuário estiver em uma
  useEffect(() => {
    if (isOpen) {
      setMode('menu');
      setError('');
      setMessage('');
      setTeamCode('');
      
      if (profile?.team_id) {
        supabase.from('teams').select('code').eq('id', profile.team_id).single()
          .then(({ data }) => {
            if (data) setCurrentTeamCode(data.code);
          });
      }
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    // Validação rígida: apenas minúsculas e números
    const cleanCode = teamCode.trim();
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
      onProfileUpdate(); // Atualiza o perfil no App principal
      setTimeout(() => setMode('menu'), 2000);
    } catch (err) {
      setError(err.message || 'Erro ao criar equipe.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTeam = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const { data, error: rpcError } = await supabase.rpc('join_team', { team_code: teamCode.trim() });
      if (rpcError) throw rpcError;
      if (data && data.startsWith('ERRO')) throw new Error(data);

      setMessage('Você entrou na equipe com sucesso!');
      onProfileUpdate();
      setTimeout(() => setMode('menu'), 2000);
    } catch (err) {
      setError(err.message || 'Erro ao entrar na equipe.');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveTeam = async () => {
    const actionText = profile?.is_team_owner ? 'EXCLUIR sua equipe e desvincular todos os membros' : 'SAIR desta equipe';
    if (!window.confirm(`Tem certeza que deseja ${actionText}? Você voltará a ser "Apenas Eu".`)) return;

    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('leave_team');
      if (rpcError) throw rpcError;
      
      setMessage('Ação realizada com sucesso!');
      onProfileUpdate();
    } catch (err) {
      setError(err.message || 'Erro ao processar saída.');
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: '#EFF6FF', borderRadius: '10px', color: '#2563EB' }}>
              <Users size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1E293B', margin: 0 }}>
                Minha Equipe
              </h2>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                {profile?.team_id ? 'Gerencie sua participação' : 'Crie ou participe de uma equipe'}
              </span>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        {error && (
          <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '10px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', display: 'flex', gap: '6px' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
          </div>
        )}
        {message && (
          <div style={{ background: '#DCFCE7', color: '#166534', padding: '10px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', display: 'flex', gap: '6px' }}>
            <CheckCircle size={16} style={{ flexShrink: 0 }} /> {message}
          </div>
        )}

        {/* ESTADO 1: Usuário JÁ ESTÁ em uma equipe */}
        {profile?.team_id ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ display: 'inline-flex', padding: '12px 24px', background: '#F1F5F9', borderRadius: '12px', border: '1.5px dashed #CBD5E1', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#64748B', display: 'block', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Código da Equipe</span>
                <span style={{ fontSize: '20px', fontWeight: 800, color: '#1E293B', letterSpacing: '1px' }}>{currentTeamCode || '...'}</span>
              </div>
            </div>
            
            <p style={{ fontSize: '14px', color: '#475569', marginBottom: '24px' }}>
              Você está na equipe <strong>{currentTeamCode}</strong>.
              <br />
              {profile?.is_team_owner ? 'Você é o Administrador desta equipe.' : 'Você é um membro desta equipe.'}
            </p>

            <button
              onClick={handleLeaveTeam}
              disabled={loading}
              style={{
                width: '100%', padding: '12px', borderRadius: '10px',
                border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#DC2626',
                fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              {profile?.is_team_owner ? <Trash2 size={18} /> : <LogOut size={18} />}
              {profile?.is_team_owner ? 'Excluir Equipe' : 'Sair da Equipe'}
            </button>
          </div>
        ) : (
          /* ESTADO 2: Usuário NÃO ESTÁ em uma equipe ("Apenas Eu") */
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
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', fontWeight: 400 }}>Seja o dono de uma nova equipe.</div>
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
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', fontWeight: 400 }}>Vincule-se a uma equipe existente.</div>
                </div>
              </button>
            </div>
          ) : (
            /* Formulário de Criação ou Entrada */
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
