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
  Undo2, 
  Redo2, 
  FileImage, 
  FileDown, 
  Users 
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
  onOpenTeam, 
  isAdmin, 
  user, 
  onOpenAuth, 
  onLogout, 
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
      {/* 1. BARRA SUPERIOR ULTRA-CLEAN */}
      <header className="top-toolbar">
        <button className="btn-icon" title="Meus Mapas" onClick={onOpenMaps}>
          <FolderOpen size={18} />
        </button>

        <div className="divider" />

        <button className="btn-icon" title="Exportar Imagem (JPG)" onClick={onExportImage}>
          <FileImage size={18} />
        </button>
        <button className="btn-icon" title="Exportar Arquivo (JSON)" onClick={onExportFile}>
          <FileDown size={18} />
        </button>

        <div className="divider" />

        {user && (
          <button className="btn-icon" title="Minha Equipe" onClick={onOpenTeam} style={{ color: '#0EA5E9' }}>
            <Users size={18} />
          </button>
        )}

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

      <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" style={{ display: 'none' }} />

      {/* 2. BOTÕES FLUTUANTES (AS 4 BOLINHAS EMPILHADAS) */}
      <div className="floating-action-container">
        {/* Bolinha 1: Avançar (Refazer) */}
        <button 
          className="fab-btn secondary" 
          title="Refazer (Ctrl + Y)" 
          disabled={!canRedo} 
          onClick={onRedo}
          style={{ opacity: canRedo ? 1 : 0.4 }}
        >
          <Redo2 size={19} />
        </button>

        {/* Bolinha 2: Voltar (Desfazer) */}
        <button 
          className="fab-btn secondary" 
          title="Desfazer (Ctrl + Z)" 
          disabled={!canUndo} 
          onClick={onUndo}
          style={{ opacity: canUndo ? 1 : 0.4 }}
        >
          <Undo2 size={19} />
        </button>

        {/* Bolinha 3: Centralizar */}
        <button 
          className="fab-btn secondary" 
          title="Encaixar na Tela (Tecla P)" 
          onClick={onResetView}
        >
          <Target size={20} />
        </button>

        {/* Bolinha 4: Nova Ideia */}
        <button 
          className="fab-btn" 
          title="Nova Ideia (+)" 
          onClick={onAddNode}
        >
          <Plus size={24} />
        </button>
      </div>

      {/* 3. GAVETA DE FORMATAÇÃO CONTEXTUAL (SÓ SURGE QUANDO BALÃO É SELECIONADO) */}
      <div className={`format-drawer ${selectedNode ? 'active' : ''}`}>
        {isNodeActive ? (
          <>
            <div className="colors-row">
              {PASTEL_COLORS.map((color, idx) => (
                <button
                  key={idx}
                  onClick={() => onUpdateSelected({ color })}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: color,
                    border: selectedNode?.backgroundColor === color ? '2px solid #2563EB' : '1px solid #CBD5E1',
                    flexShrink: 0,
                    cursor: 'pointer',
                    padding: 0
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <button className="btn-icon" onClick={() => onUpdateSelected({ fontSize: Math.min((selectedNode?.fontSize || 14) + 2, 36) })}><span style={{ fontWeight: 700, fontSize: '13px' }}>A+</span></button>
                <button className="btn-icon" onClick={() => onUpdateSelected({ fontSize: Math.max((selectedNode?.fontSize || 14) - 2, 10) })}><span style={{ fontWeight: 600, fontSize: '11px' }}>A-</span></button>
              </div>
              <div className="divider" />
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <button className={`btn-icon ${selectedNode?.textAlignment === 'Left' ? 'active' : ''}`} onClick={() => onUpdateSelected({ align: 'Left' })}><AlignLeft size={16} /></button>
                <button className={`btn-icon ${selectedNode?.textAlignment === 'Center' ? 'active' : ''}`} onClick={() => onUpdateSelected({ align: 'Center' })}><AlignCenter size={16} /></button>
                <button className={`btn-icon ${selectedNode?.textAlignment === 'Right' ? 'active' : ''}`} onClick={() => onUpdateSelected({ align: 'Right' })}><AlignRight size={16} /></button>
                <button className={`btn-icon ${selectedNode?.textAlignment === 'Justify' ? 'active' : ''}`} onClick={() => onUpdateSelected({ align: 'Justify' })}><AlignJustify size={16} /></button>
              </div>
              <div className="divider" />
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button className="btn-icon" onClick={() => fileInputRef.current?.click()} title="Inserir Imagem"><ImageIcon size={17} /></button>
                <button className="btn-icon" onClick={onDeleteSelected} style={{ color: '#EF4444' }} title="Excluir Balão"><Trash2 size={17} /></button>
              </div>
            </div>
          </>
        ) : selectedNode?.isConnection ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 4px' }}>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Linha selecionada</span>
            <button className="btn-icon" onClick={onDeleteSelected} style={{ color: '#EF4444', gap: '4px' }}>
              <Trash2 size={16} /> <span style={{ fontSize: '12px', fontWeight: 600 }}>Excluir Linha</span>
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}
