import React, { useRef } from 'react';
import { 
  Plus, 
  Image as ImageIcon, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  Target,
  Trash2,
  FolderOpen,
  Shield,
  LogIn,
  LogOut,
  Cloud,
  Undo2,
  Redo2,
  FileImage,
  FileDown
} from 'lucide-react';
import { PASTEL_COLORS } from '../constants';

export default function Toolbar({ 
  onAddNode, 
  onExportImage,
  onExportFile,
  onAddImage, 
  selectedNode, 
  onUpdateSelected,
  onDeleteSelected,
  onResetView,
  onOpenMaps,
  onOpenAdmin,
  isAdmin,
  user,
  onOpenAuth,
  onLogout,
  isSaving,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}) {
  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => onAddImage(event.target.result);
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const isNodeActive = Boolean(selectedNode && !selectedNode.isConnection);

  return (
    <>
      {/* 1. BARRA SUPERIOR (HEADER) */}
      <header className="top-toolbar">
        {/* Meus Mapas */}
        <button className="btn-icon" title="Meus Mapas" onClick={onOpenMaps}>
          <FolderOpen size={18} />
        </button>

        <div className="divider" />

        {/* Desfazer e Refazer */}
        <button 
          className="btn-icon" 
          title="Desfazer (Ctrl + Z)" 
          disabled={!canUndo} 
          onClick={onUndo}
          style={{ opacity: canUndo ? 1 : 0.4 }}
        >
          <Undo2 size={17} />
        </button>
        <button 
          className="btn-icon" 
          title="Refazer (Ctrl + Y)" 
          disabled={!canRedo} 
          onClick={onRedo}
          style={{ opacity: canRedo ? 1 : 0.4 }}
        >
          <Redo2 size={17} />
        </button>

        {/* AÇÕES QUE APARECEM NO TOPO APENAS NO PC */}
        <div className="desktop-only" style={{ alignItems: 'center', gap: '6px' }}>
          <div className="divider" />
          <button className="btn-icon" title="Novo Balão" onClick={onAddNode}>
            <Plus size={18} />
          </button>
          <button className="btn-icon" title="Inserir Imagem" onClick={() => fileInputRef.current?.click()}>
            <ImageIcon size={18} />
          </button>
          <button className="btn-icon" title="Encaixar na Tela (P)" onClick={onResetView}>
            <Target size={18} />
          </button>
          <button 
            className="btn-icon" 
            title="Excluir Balão ou Conexão" 
            disabled={!selectedNode}
            onClick={onDeleteSelected}
            style={{ color: selectedNode ? '#EF4444' : '#CBD5E1' }}
          >
            <Trash2 size={18} />
          </button>
        </div>

        <div className="divider" />

        {/* Exportações */}
        <button className="btn-icon" title="Exportar Imagem (JPG)" onClick={onExportImage}>
          <FileImage size={18} />
        </button>
        <button className="btn-icon" title="Exportar Arquivo (JSON)" onClick={onExportFile}>
          <FileDown size={18} />
        </button>

        {/* FORMATAÇÃO DIRETA NO TOPO (APENAS PC) */}
        <div className="desktop-only" style={{ alignItems: 'center', gap: '6px' }}>
          <div className="divider" />
          <button 
            className={`btn-icon ${selectedNode?.textAlignment === 'Left' ? 'active' : ''}`}
            title="Alinhar à Esquerda" 
            disabled={!isNodeActive}
            onClick={() => onUpdateSelected({ align: 'Left' })}>
            <AlignLeft size={16} />
          </button>
          <button 
            className={`btn-icon ${selectedNode?.textAlignment === 'Center' ? 'active' : ''}`}
            title="Centralizar Texto" 
            disabled={!isNodeActive}
            onClick={() => onUpdateSelected({ align: 'Center' })}>
            <AlignCenter size={16} />
          </button>
          <button 
            className={`btn-icon ${selectedNode?.textAlignment === 'Right' ? 'active' : ''}`}
            title="Alinhar à Direita" 
            disabled={!isNodeActive}
            onClick={() => onUpdateSelected({ align: 'Right' })}>
            <AlignRight size={16} />
          </button>

          <div className="divider" />
          <button 
            className="btn-icon" 
            title="Aumentar Fonte (A+)" 
            disabled={!isNodeActive}
            onClick={() => onUpdateSelected({ fontSize: Math.min((selectedNode?.fontSize || 14) + 2, 36) })}>
            <span style={{ fontWeight: 700, fontSize: '13px' }}>A+</span>
          </button>
          <button 
            className="btn-icon" 
            title="Diminuir Fonte (A-)" 
            disabled={!isNodeActive}
            onClick={() => onUpdateSelected({ fontSize: Math.max((selectedNode?.fontSize || 14) - 2, 10) })}>
            <span style={{ fontWeight: 600, fontSize: '11px' }}>A-</span>
          </button>

          <div className="divider" />
          {/* Paleta das 10 cores no Desktop */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {PASTEL_COLORS.map((color, idx) => (
              <button
                key={idx}
                disabled={!isNodeActive}
                onClick={() => onUpdateSelected({ color })}
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: color,
                  border: selectedNode?.backgroundColor === color ? '2px solid #2563EB' : '1px solid #CBD5E1',
                  cursor: isNodeActive ? 'pointer' : 'default',
                  padding: 0
                }}
              />
            ))}
          </div>
        </div>

        <div className="divider" />

        {/* Indicador de Nuvem */}
        <span 
          title={isSaving ? 'Salvando...' : 'Salvo na nuvem'} 
          style={{ display: 'flex', alignItems: 'center', color: isSaving ? '#F59E0B' : '#10B981', flexShrink: 0 }}
        >
          <Cloud size={16} />
        </span>

        {/* Admin e Perfil */}
        {isAdmin && (
          <button className="btn-icon" title="Painel do Administrador" onClick={onOpenAdmin} style={{ color: '#2563EB' }}>
            <Shield size={18} />
          </button>
        )}

        {user ? (
          <button className="btn-icon" title="Sair da Conta" onClick={onLogout}>
            <LogOut size={16} />
          </button>
        ) : (
          <button className="btn-icon" title="Entrar" onClick={onOpenAuth} style={{ color: '#2563EB' }}>
            <LogIn size={16} />
          </button>
        )}
      </header>

      {/* Input oculto para upload de imagens */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImageChange} 
        accept="image/*" 
        style={{ display: 'none' }} 
      />

      {/* 2. BOTÕES FLUTUANTES RÁPIDOS NO CELULAR (Canto Inferior Direito) */}
      <div className="mobile-fab-container">
        <button 
          className="fab-btn secondary" 
          title="Centralizar Mapa" 
          onClick={onResetView}
        >
          <Target size={20} />
        </button>
        <button 
          className="fab-btn" 
          title="Nova Ideia" 
          onClick={onAddNode}
        >
          <Plus size={24} />
        </button>
      </div>

      {/* 3. GAVETA CONTEXTUAL DE FORMATAÇÃO NO CELULAR (Aparece perto do polegar ao tocar num balão) */}
      <div className={`mobile-format-drawer ${selectedNode ? 'active' : ''}`}>
        {isNodeActive ? (
          <>
            {/* Linha 1: Carrossel das 10 Cores Suaves */}
            <div className="colors-carousel">
              {PASTEL_COLORS.map((color, idx) => (
                <button
                  key={idx}
                  onClick={() => onUpdateSelected({ color })}
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    backgroundColor: color,
                    border: selectedNode?.backgroundColor === color ? '2px solid #2563EB' : '1px solid #CBD5E1',
                    flexShrink: 0,
                    cursor: 'pointer'
                  }}
                />
              ))}
            </div>

            {/* Linha 2: Tamanho da Fonte, Alinhamentos, Foto e Lixeira */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button 
                  className="btn-icon" 
                  onClick={() => onUpdateSelected({ fontSize: Math.min((selectedNode?.fontSize || 14) + 2, 36) })}>
                  <span style={{ fontWeight: 700, fontSize: '13px' }}>A+</span>
                </button>
                <button 
                  className="btn-icon" 
                  onClick={() => onUpdateSelected({ fontSize: Math.max((selectedNode?.fontSize || 14) - 2, 10) })}>
                  <span style={{ fontWeight: 600, fontSize: '11px' }}>A-</span>
                </button>
              </div>

              <div className="divider" />

              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <button 
                  className={`btn-icon ${selectedNode?.textAlignment === 'Left' ? 'active' : ''}`}
                  onClick={() => onUpdateSelected({ align: 'Left' })}>
                  <AlignLeft size={16} />
                </button>
                <button 
                  className={`btn-icon ${selectedNode?.textAlignment === 'Center' ? 'active' : ''}`}
                  onClick={() => onUpdateSelected({ align: 'Center' })}>
                  <AlignCenter size={16} />
                </button>
                <button 
                  className={`btn-icon ${selectedNode?.textAlignment === 'Right' ? 'active' : ''}`}
                  onClick={() => onUpdateSelected({ align: 'Right' })}>
                  <AlignRight size={16} />
                </button>
              </div>

              <div className="divider" />

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button className="btn-icon" onClick={() => fileInputRef.current?.click()} title="Inserir Imagem">
                  <ImageIcon size={17} />
                </button>
                <button className="btn-icon" onClick={onDeleteSelected} style={{ color: '#EF4444' }} title="Excluir Balão">
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          </>
        ) : selectedNode?.isConnection ? (
          /* Quando apenas uma linha de conexão estiver selecionada no celular */
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Linha de conexão selecionada</span>
            <button className="btn-icon" onClick={onDeleteSelected} style={{ color: '#EF4444', gap: '4px' }}>
              <Trash2 size={16} /> <span style={{ fontSize: '12px', fontWeight: 600 }}>Excluir Linha</span>
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}
