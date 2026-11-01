import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Shield, X, RotateCcw, CheckCircle, AlertTriangle, Trash2, KeyRound, ShieldAlert, Database, FolderOpen, Eye, Edit3 } from 'lucide-react';

export default function AdminPanel({ isOpen, onClose, onSelectMap }) {
  const [profiles, setProfiles] = useState([]);
  const [teams, setTeams] = useState([]);
  const [allMaps, setAllMaps] = useState([]);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Estado para o Pop-up de visualização de mapas de um usuário
  const [previewUser, setPreviewUser] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Identifica quem é o admin logado
      const { data: { user } } = await supabase.auth.getUser();
      const { data: myProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setCurrentAdmin(myProfile);

      const isGeneral = myProfile.role === 'admin';
      const isTeamOwner = myProfile.is_team_owner;

      // 2. Busca usuários (Todos se for Geral; Apenas da equipe se for Dono)
      let pQuery = supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (!isGeneral && isTeamOwner) {
        pQuery = pQuery.eq('team_id', myProfile.team_id);
      }
      const { data: pData, error: pError } = await pQuery;
      if (pError) throw pError;

      // 3. Busca equipes para nomes
      const { data: tData } = await supabase.from('teams').select('*');

      // 4. Busca os mapas para calcular tamanho e exibir no preview (A RLS do banco já filtra o que ele pode ver)
      const { data: mData } = await supabase.from('maps').select('id, title, user_id, data, updated_at');

      setProfiles(pData || []);
      setTeams(tData || []);
      setAllMaps(mData || []);
    } catch (err) {
      setError('Erro ao carregar dados: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setMessage('');
      setError('');
      setPreviewUser(null);
    }
  }, [isOpen]);

  const handleApproveReset = async (userId, userName) => {
    if (!window.confirm(`Autorizar reset para ${userName}? A senha ficará 12345678.`)) return;
    try {
      let rpcName = currentAdmin?.role === 'admin' ? 'admin_approve_reset' : 'team_admin_reset_password';
      const { data, error } = await supabase.rpc(rpcName, { target_user_id: userId });
      if (error) throw error;
      setMessage(`Senha de ${userName} resetada com sucesso!`);
      loadData();
    } catch (err) {
      setError(err.message || 'Erro ao redefinir a senha.');
    }
  };

  const handleToggleRole = async (userId, userName, currentRole) => {
    const action = currentRole === 'admin' ? 'rebaixar' : 'promover a Administrador Geral';
    if (!window.confirm(`Tem certeza que deseja ${action} ${userName}?`)) return;
    try {
      const { data, error } = await supabase.rpc('admin_toggle_role', { target_user_id: userId });
      if (error) throw error;
      setMessage(data || 'Cargo atualizado com sucesso!');
      loadData();
    } catch (err) {
      setError(err.message || 'Erro ao alterar cargo.');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`ATENÇÃO: Deseja realmente excluir ${userName} e todos os seus mapas permanentemente?`)) return;
    try {
      const { data, error } = await supabase.rpc('admin_delete_user', { target_user_id: userId });
      if (error) throw error;
      setMessage(`Usuário ${userName} excluído com sucesso!`);
      loadData();
    } catch (err) {
      setError(err.message || 'Erro ao excluir usuário.');
    }
  };

  const handleChangeAdminPassword = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    if (adminNewPassword.length < 6) return setError('A nova senha deve ter no mínimo 6 caracteres.');
    if (adminNewPassword !== adminConfirmPassword) return setError('As senhas não coincidem.');

    setPasswordLoading(true);
    try {
      const { error: authError } = await supabase.auth.updateUser({ password: adminNewPassword });
      if (authError) throw authError;
      setMessage('Sua senha foi alterada com sucesso!');
      setAdminNewPassword(''); setAdminConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Erro ao alterar sua senha.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const isGeneralAdmin = currentAdmin?.role === 'admin';

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1500, padding: '16px', boxSizing: 'border-box'
    }}>
      <div style={{
        background: '#FFFFFF', borderRadius: '16px', padding: '24px', width: '100%',
        maxWidth: previewUser ? '500px' : '720px', maxHeight: '90vh',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', border: '1px solid #E2E8F0',
        display: 'flex', flexDirection: 'column', boxSizing: 'border-box', transition: 'max-width 0.3s'
      }}>
        
        {/* CABEÇALHO */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: isGeneralAdmin ? '#EFF6FF' : '#F5F3FF', borderRadius: '10px', color: isGeneralAdmin ? '#2563EB' : '#8B5CF6' }}>
              <Shield size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1E293B', margin: 0 }}>
                {previewUser ? `Mapas de ${previewUser.name}` : (isGeneralAdmin ? 'Painel de Administração Geral' : 'Painel da Equipe')}
              </h2>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                {previewUser ? 'Selecione um mapa para revisar e corrigir' : (isGeneralAdmin ? 'Gerencie todos os usuários do sistema' : 'Gerencie os membros da sua equipe')}
              </span>
            </div>
          </div>
          <button className="btn-icon" onClick={() => previewUser ? setPreviewUser(null) : onClose()}><X size={20} /></button>
        </div>

        {error && <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '10px', borderRadius: '8px', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
        {message && <div style={{ background: '#DCFCE7', color: '#166534', padding: '10px', borderRadius: '8px', fontSize: '13px', marginBottom: '12px' }}>{message}</div>}

        {/* MODO 2: POP-UP DE PRÉ-VISUALIZAÇÃO DOS MAPAS DE UM USUÁRIO */}
        {previewUser ? (
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {allMaps.filter(m => m.user_id === previewUser.id).length === 0 ? (
              <p style={{ textAlign: 'center', color: '#64748B', fontSize: '13px', padding: '20px' }}>Este usuário não possui mapas criados.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {allMaps.filter(m => m.user_id === previewUser.id).map(map => (
                  <div key={map.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', background: '#F8FAFC'
                  }}>
                    <div>
                      <strong style={{ fontSize: '14px', color: '#1E293B', display: 'block' }}>{map.title}</strong>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>
                        Tamanho: {formatBytes(new Blob([JSON.stringify(map.data)]).size)}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        if (onSelectMap) {
                          onSelectMap(map);
                          onClose();
                        } else {
                          alert('O recurso de abertura será ligado no próximo passo!');
                        }
                      }}
                      style={{
                        background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE',
                        borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 600,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                      }}
                    >
                      <Edit3 size={14} /> Abrir e Corrigir
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* MODO 1: LISTA DE USUÁRIOS E GERENCIAMENTO */
          <>
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px', marginBottom: '16px' }}>
              {loading ? (
                <p style={{ textAlign: 'center', color: '#64748B', fontSize: '14px', padding: '20px' }}>Carregando dados...</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {profiles.map((u) => {
                    const userMaps = allMaps.filter(m => m.user_id === u.id);
                    const storageBytes = userMaps.reduce((acc, m) => acc + new Blob([JSON.stringify(m.data)]).size, 0);
                    const userTeam = teams.find(t => t.id === u.team_id);

                    return (
                      <div key={u.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 14px', borderRadius: '10px',
                        border: u.reset_requested ? '1.5px solid #F59E0B' : '1px solid #E2E8F0',
                        backgroundColor: u.reset_requested ? '#FFFBEB' : '#F8FAFC',
                        flexWrap: 'wrap', gap: '10px'
                      }}>
                        {/* Infos do Usuário */}
                        <div style={{ minWidth: '200px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '14px', color: '#1E293B' }}>{u.name}</strong>
                            
                            {/* Badges de Hierarquia */}
                            {u.role === 'admin' && <span style={{ fontSize: '10px', padding: '2px 6px', background: '#DBEAFE', color: '#1D4ED8', borderRadius: '4px', fontWeight: 700 }}>ADMIN GERAL</span>}
                            {u.is_team_owner && userTeam && <span style={{ fontSize: '10px', padding: '2px 6px', background: '#F3E8FF', color: '#7E22CE', borderRadius: '4px', fontWeight: 700 }}>DONO: {userTeam.code.toUpperCase()}</span>}
                            {!u.is_team_owner && userTeam && <span style={{ fontSize: '10px', padding: '2px 6px', background: '#E2E8F0', color: '#475569', borderRadius: '4px', fontWeight: 700 }}>EQUIPE: {userTeam.code.toUpperCase()}</span>}
                            
                            {u.reset_requested && <span style={{ fontSize: '11px', padding: '2px 8px', background: '#FDE68A', color: '#92400E', borderRadius: '6px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={12} /> Reset Solicitado</span>}
                          </div>
                          
                          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{u.email}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#E0F2FE', color: '#0369A1', padding: '2px 6px', borderRadius: '4px' }}>
                              <Database size={12} /> {formatBytes(storageBytes)} ({userMaps.length} mapas)
                            </span>
                          </div>
                        </div>

                        {/* Botões de Ação */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          
                          {/* Botão Ver Mapas (Qualquer Admin pode ver os mapas que lhe são permitidos) */}
                          <button
                            onClick={() => setPreviewUser(u)}
                            className="btn-icon"
                            style={{ color: '#0EA5E9', border: '1px solid #BAE6FD', padding: '6px 10px', gap: '4px', fontSize: '12px', fontWeight: 600 }}
                          >
                            <FolderOpen size={15} /> Mapas
                          </button>

                          {/* Resetar Senha */}
                          <button
                            onClick={() => handleApproveReset(u.id, u.name)}
                            style={{
                              background: u.reset_requested ? '#F59E0B' : '#FFFFFF',
                              color: u.reset_requested ? '#FFFFFF' : '#475569',
                              border: u.reset_requested ? 'none' : '1px solid #CBD5E1',
                              borderRadius: '8px', padding: '6px 10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                          >
                            <RotateCcw size={13} /> {u.reset_requested ? 'Autorizar' : 'Resetar'}
                          </button>

                          {/* Ações Exclusivas do Admin Geral */}
                          {isGeneralAdmin && (
                            <>
                              <button
                                onClick={() => handleToggleRole(u.id, u.name, u.role)}
                                className="btn-icon"
                                style={{ color: u.role === 'admin' ? '#2563EB' : '#94A3B8', border: '1px solid #CBD5E1' }}
                                title={u.role === 'admin' ? 'Remover privilégio Geral' : 'Tornar Admin Geral'}
                              >
                                {u.role === 'admin' ? <ShieldAlert size={15} /> : <Shield size={15} />}
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id, u.name)}
                                className="btn-icon"
                                style={{ color: '#EF4444', border: '1px solid #FCA5A5' }}
                                title="Excluir usuário e mapas permanentemente"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Redefinição de Senha Própria do Admin */}
            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <KeyRound size={16} color="#2563EB" />
                <strong style={{ fontSize: '13px', color: '#1E293B' }}>Alterar Minha Senha ({isGeneralAdmin ? 'Admin Geral' : 'Dono da Equipe'})</strong>
              </div>
              <form onSubmit={handleChangeAdminPassword} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  type="password" placeholder="Nova Senha" required value={adminNewPassword}
                  onChange={(e) => setAdminNewPassword(e.target.value)}
                  style={{ flex: 1, minWidth: '140px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
                <input
                  type="password" placeholder="Confirme a Senha" required value={adminConfirmPassword}
                  onChange={(e) => setAdminConfirmPassword(e.target.value)}
                  style={{ flex: 1, minWidth: '140px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
                <button
                  type="submit" disabled={passwordLoading}
                  style={{ background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '0 14px', height: '36px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  {passwordLoading ? 'Salvando...' : 'Salvar Senha'}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
