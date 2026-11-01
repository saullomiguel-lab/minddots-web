import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { ShieldCheck, Lock } from 'lucide-react';

export default function ForcePasswordChangeModal({ isOpen, userId, onSuccess }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (newPassword === '12345678') {
      setError('Escolha uma senha diferente da temporária 12345678.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas digitadas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      // 1. Atualiza a senha no Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (authError) throw authError;

      // 2. Remove o aviso de troca obrigatória no perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ must_change_password: false })
        .eq('id', userId);

      if (profileError) throw profileError;

      onSuccess();
    } catch (err) {
      setError(err.message || 'Erro ao alterar a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        padding: '32px',
        width: '100%',
        maxWidth: '380px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        border: '1px solid #E2E8F0',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'inline-flex',
          padding: '12px',
          backgroundColor: '#FEF3C7',
          borderRadius: '50%',
          color: '#D97706',
          marginBottom: '12px'
        }}>
          <ShieldCheck size={30} />
        </div>

        <h2 style={{ fontSize: '19px', fontWeight: 600, color: '#1E293B', margin: 0 }}>
          Cadastre sua Nova Senha
        </h2>
        <p style={{ fontSize: '13px', color: '#64748B', marginTop: '6px', marginBottom: '20px' }}>
          Você entrou com a senha temporária. Para sua segurança, defina sua nova senha definitiva.
        </p>

        {error && (
          <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '10px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', textAlign: 'left' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94A3B8' }} />
            <input
              type="password"
              placeholder="Nova Senha Definitiva"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', outline: 'none' }}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94A3B8' }} />
            <input
              type="password"
              placeholder="Confirme a Nova Senha"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', outline: 'none' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: '#3B82F6',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '12px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              marginTop: '4px'
            }}
          >
            {loading ? 'Salvando...' : 'Salvar Senha e Acessar'}
          </button>
        </form>
      </div>
    </div>
  );
}
