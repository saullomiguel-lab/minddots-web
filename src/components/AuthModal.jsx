import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { User, Mail, Lock, ArrowLeft, UserPlus, LogIn, Sparkles } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'register') {
        if (password !== confirmPassword) {
          setError('As senhas digitadas não coincidem.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('A senha deve ter pelo menos 6 caracteres.');
          setLoading(false);
          return;
        }
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() } }
        });
        if (signUpError) throw signUpError;
        onAuthSuccess();
      } else if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (signInError) throw signInError;
        onAuthSuccess();
      } else if (mode === 'forgot') {
        const { data, error: rpcError } = await supabase.rpc('request_password_reset', {
          user_email: email.trim()
        });
        if (rpcError) throw rpcError;
        setMessage(data || 'Solicitação enviada ao administrador.');
      }
    } catch (err) {
      setError(err.message || 'Ocorreu um erro. Verifique os dados digitados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '14px',
      zIndex: 2000,
      boxSizing: 'border-box'
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: '22px',
        padding: '28px 22px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 25px 40px -10px rgba(0, 0, 0, 0.2)',
        border: '1px solid #E2E8F0',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Logo e Cabeçalho Moderno */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '52px',
            height: '52px',
            background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
            borderRadius: '16px',
            color: '#2563EB',
            marginBottom: '10px',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.12)'
          }}>
            <Sparkles size={26} />
          </div>
          <h1 style={{ fontSize: '21px', fontWeight: 700, color: '#1E293B', margin: 0, letterSpacing: '-0.3px' }}>
            MindDots
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', margin: 0 }}>
            Seu Mapa Mental Moderno
          </p>
        </div>

        {/* Alternador de Abas Moderno: [ Fazer Login ] | [ Cadastre-se ] */}
        {mode !== 'forgot' && (
          <div style={{
            display: 'flex',
            background: '#F1F5F9',
            borderRadius: '12px',
            padding: '4px',
            marginBottom: '18px'
          }}>
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setMessage(''); }}
              style={{
                flex: 1,
                padding: '9px 0',
                borderRadius: '9px',
                border: 'none',
                background: mode === 'login' ? '#FFFFFF' : 'transparent',
                color: mode === 'login' ? '#2563EB' : '#64748B',
                fontWeight: mode === 'login' ? 700 : 500,
                fontSize: '13px',
                boxShadow: mode === 'login' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Fazer Login
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); setMessage(''); }}
              style={{
                flex: 1,
                padding: '9px 0',
                borderRadius: '9px',
                border: 'none',
                background: mode === 'register' ? '#2563EB' : 'transparent',
                color: mode === 'register' ? '#FFFFFF' : '#475569',
                fontWeight: 700,
                fontSize: '13px',
                boxShadow: mode === 'register' ? '0 3px 10px rgba(37, 99, 235, 0.3)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Cadastre-se ✨
            </button>
          </div>
        )}

        {/* Mensagens de Feedback */}
        {error && (
          <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '10px 12px', borderRadius: '10px', fontSize: '13px', marginBottom: '14px', lineHeight: '1.4' }}>
            {error}
          </div>
        )}

        {message && (
          <div style={{ background: '#DCFCE7', color: '#166534', padding: '10px 12px', borderRadius: '10px', fontSize: '13px', marginBottom: '14px', lineHeight: '1.4' }}>
            {message}
          </div>
        )}

        {/* Formulário com Inputs mais Altos para Telas Touch */}
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
          {mode === 'register' && (
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Seu Nome Completo"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%', height: '46px', padding: '0 12px 0 42px', borderRadius: '10px', border: '1.5px solid #CBD5E1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <Mail size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: '#94A3B8' }} />
            <input
              type="email"
              placeholder="Seu E-mail"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', height: '46px', padding: '0 12px 0 42px', borderRadius: '10px', border: '1.5px solid #CBD5E1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {mode !== 'forgot' && (
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: '#94A3B8' }} />
              <input
                type="password"
                placeholder="Sua Senha"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', height: '46px', padding: '0 12px 0 42px', borderRadius: '10px', border: '1.5px solid #CBD5E1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          )}

          {mode === 'register' && (
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: '#94A3B8' }} />
              <input
                type="password"
                placeholder="Confirme a Senha"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ width: '100%', height: '46px', padding: '0 12px 0 42px', borderRadius: '10px', border: '1.5px solid #CBD5E1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          )}

          {/* Botão de Ação Principal */}
          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '11px',
              height: '48px',
              fontWeight: 700,
              fontSize: '15px',
              cursor: 'pointer',
              marginTop: '4px',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            {loading ? 'Processando...' : mode === 'login' ? 'Acessar Meu Mapa' : mode === 'register' ? 'Criar Minha Conta Grátis' : 'Solicitar ao Administrador'}
          </button>
        </form>

        {/* Rodapé e Botão de Destaque para Cadastro */}
        <div style={{ textAlign: 'center', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {mode === 'login' && (
            <>
              <button
                type="button"
                onClick={() => { setMode('forgot'); setError(''); setMessage(''); }}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}
              >
                Esqueceu a senha? Solicitar ao administrador
              </button>

              <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '14px', marginTop: '4px' }}>
                <span style={{ fontSize: '13px', color: '#64748B', display: 'block', marginBottom: '8px' }}>
                  Ainda não tem conta no MindDots?
                </span>
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(''); setMessage(''); }}
                  style={{
                    width: '100%',
                    height: '44px',
                    borderRadius: '10px',
                    border: '1.5px solid #2563EB',
                    background: '#EFF6FF',
                    color: '#2563EB',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <UserPlus size={16} /> Cadastre-se Gratuitamente
                </button>
              </div>
            </>
          )}

          {mode === 'register' && (
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setMessage(''); }}
              style={{ background: 'none', border: 'none', color: '#2563EB', fontWeight: 600, fontSize: '13px', cursor: 'pointer', marginTop: '4px' }}
            >
              Já possui uma conta? Fazer Login
            </button>
          )}

          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setMessage(''); }}
              style={{ background: 'none', border: 'none', color: '#475569', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}
            >
              <ArrowLeft size={15} /> Voltar para o Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
