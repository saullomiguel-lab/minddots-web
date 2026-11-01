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

  return (
    <header className="top-toolbar">
      {/* Meus Mapas */}
      <button className="btn-icon" title="Meus Mapas" onClick={onOpenMaps}>
        <FolderOpen size={18} />
      </button>

      <div className="divider" />

      {/* Botões Desfazer e Refazer */}
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

      <div className="divider" />

      {/* Botão Novo Balão */}
      <button className="btn-icon" title="Novo Balão" onClick={onAddNode}>
        <Plus size={18} />
      </button>

      {/* Inserir Imagem no Balão Selecionado */}
      <button className="btn-icon" title="Inserir Imagem" onClick={() => fileInputRef.current?.click()}>
        <ImageIcon size={18} />
      </button>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImageChange} 
        accept="image/*" 
        style={{ display: 'none' }} 
      />

      {/* Centralizar e Encaixar Mapa (Tecla P) */}
      <button className="btn-icon" title="Encaixar Mapa na Tela (Tecla P)" onClick={onResetView}>
        <Target size={18} />
      </button>

      {/* Excluir Nó ou Conexão Selecionada */}
      <button 
        className="btn-icon" 
        title="Excluir Balão ou Conexão (Tecla Delete)" 
        disabled={!selectedNode}
        onClick={onDeleteSelected}
        style={{ color: selectedNode ? '#EF4444' : '#CBD5E1' }}
      >
        <Trash2 size={18} />
      </button>

      <div className="divider" />

      {/* 1. Exportar Imagem (JPG em Alta Resolução com Salvar Como) */}
      <button 
        className="btn-icon" 
        title="Exportar Imagem do Mapa (JPG em Alta Resolução)" 
        onClick={onExportImage}
      >
        <FileImage size={18} />
      </button>

      {/* 2. Exportar Arquivo (JSON com Salvar Como) */}
      <button 
        className="btn-icon" 
        title="Exportar Arquivo do Mapa (JSON)" 
        onClick={onExportFile}
      >
        <FileDown size={18} />
      </button>

      <div className="divider" />

      {/* Alinhamento de Texto */}
      <button 
        className={`btn-icon ${selectedNode?.textAlignment === 'Left' ? 'active' : ''}`}
        title="Alinhar à Esquerda" 
        disabled={!selectedNode || selectedNode.isConnection}
        onClick={() => onUpdateSelected({ align: 'Left' })}>
        <AlignLeft size={16} />
      </button>
      <button 
        className={`btn-icon ${selectedNode?.textAlignment === 'Center' ? 'active' : ''}`}
        title="Centralizar Texto" 
        disabled={!selectedNode || selectedNode.isConnection}
        onClick={() => onUpdateSelected({ align: 'Center' })}>
        <AlignCenter size={16} />
      </button>
      <button 
        className={`btn-icon ${selectedNode?.textAlignment === 'Right' ? 'active' : ''}`}
        title="Alinhar à Direita" 
        disabled={!selectedNode || selectedNode.isConnection}
        onClick={() => onUpdateSelected({ align: 'Right' })}>
        <AlignRight size={16} />
      </button>
      <button 
        className={`btn-icon ${selectedNode?.textAlignment === 'Justify' ? 'active' : ''}`}
        title="Justificar Texto" 
        disabled={!selectedNode || selectedNode.isConnection}
        onClick={() => onUpdateSelected({ align: 'Justify' })}>
        <AlignJustify size={16} />
      </button>

      <div className="divider" />

      {/* Tamanho da Fonte (A+ / A-) */}
      <button 
        className="btn-icon" 
        title="Aumentar Fonte (A+)" 
        disabled={!selectedNode || selectedNode.isConnection}
        onClick={() => onUpdateSelected({ fontSize: Math.min((selectedNode?.fontSize || 14) + 2, 36) })}>
        <span style={{ fontWeight: 700, fontSize: '13px' }}>A+</span>
      </button>
      <button 
        className="btn-icon" 
        title="Diminuir Fonte (A-)" 
        disabled={!selectedNode || selectedNode.isConnection}
        onClick={() => onUpdateSelected({ fontSize: Math.max((selectedNode?.fontSize || 14) - 2, 10) })}>
        <span style={{ fontWeight: 600, fontSize: '11px' }}>A-</span>
      </button>

      <div className="divider" />

      {/* Paleta de 10 cores suaves */}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {PASTEL_COLORS.map((color, idx) => (
          <button
            key={idx}
            disabled={!selectedNode || selectedNode.isConnection}
            onClick={() => onUpdateSelected({ color })}
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              backgroundColor: color,
              border: selectedNode?.backgroundColor === color ? '2px solid #2563EB' : '1px solid #CBD5E1',
              cursor: selectedNode && !selectedNode.isConnection ? 'pointer' : 'default',
              padding: 0
            }}
          />
        ))}
      </div>

      <div className="divider" />

      {/* Indicador de Nuvem */}
      <span title={isSaving ? 'Salvando na nuvem...' : 'Salvo na nuvem'} style={{ display: 'flex', alignItems: 'center', color: isSaving ? '#F59E0B' : '#10B981' }}>
        <Cloud size={16} />
      </span>

      {/* Painel do Administrador */}
      {isAdmin && (
        <button className="btn-icon" title="Painel do Administrador" onClick={onOpenAdmin} style={{ color: '#2563EB' }}>
          <Shield size={18} />
        </button>
      )}

      {/* Entrar ou Sair */}
      {user ? (
        <button className="btn-icon" title="Sair da Conta" onClick={onLogout}>
          <LogOut size={16} />
        </button>
      ) : (
        <button className="btn-icon" title="Entrar / Cadastrar" onClick={onOpenAuth} style={{ color: '#2563EB' }}>
          <LogIn size={16} />
        </button>
      )}
    </header>
  );
}
