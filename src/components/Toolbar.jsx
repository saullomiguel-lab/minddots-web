import React, { useRef } from 'react';
import { 
  Plus, 
  Download, 
  Image as ImageIcon, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  Target
} from 'lucide-react';
import { PASTEL_COLORS } from '../constants';

export default function Toolbar({ 
  onAddNode, 
  onExport, 
  onAddImage, 
  selectedNode, 
  onUpdateSelected,
  onResetView 
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
      {/* Botão Novo Balão */}
      <button className="btn-icon" title="Novo Balão" onClick={onAddNode}>
        <Plus size={18} />
      </button>

      {/* Botão Inserir Imagem */}
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

      {/* Centralizar Mapa (Atalho P) */}
      <button className="btn-icon" title="Centralizar Mapa (Tecla P)" onClick={onResetView}>
        <Target size={18} />
      </button>

      {/* Exportar */}
      <button className="btn-icon" title="Exportar Mapa (JSON)" onClick={onExport}>
        <Download size={18} />
      </button>

      <div className="divider" />

      {/* Alinhamento de Texto */}
      <button 
        className={`btn-icon ${selectedNode?.align === 'left' ? 'active' : ''}`}
        title="Alinhar à Esquerda" 
        disabled={!selectedNode}
        onClick={() => onUpdateSelected({ align: 'left' })}>
        <AlignLeft size={16} />
      </button>
      <button 
        className={`btn-icon ${selectedNode?.align === 'center' ? 'active' : ''}`}
        title="Centralizar Texto" 
        disabled={!selectedNode}
        onClick={() => onUpdateSelected({ align: 'center' })}>
        <AlignCenter size={16} />
      </button>
      <button 
        className={`btn-icon ${selectedNode?.align === 'right' ? 'active' : ''}`}
        title="Alinhar à Direita" 
        disabled={!selectedNode}
        onClick={() => onUpdateSelected({ align: 'right' })}>
        <AlignRight size={16} />
      </button>
      <button 
        className={`btn-icon ${selectedNode?.align === 'justify' ? 'active' : ''}`}
        title="Justificar Texto" 
        disabled={!selectedNode}
        onClick={() => onUpdateSelected({ align: 'justify' })}>
        <AlignJustify size={16} />
      </button>

      <div className="divider" />

      {/* Tamanho da Fonte (A+ / A-) */}
      <button 
        className="btn-icon" 
        title="Aumentar Fonte (A+)" 
        disabled={!selectedNode}
        onClick={() => onUpdateSelected({ fontSize: Math.min((selectedNode?.fontSize || 14) + 2, 32) })}>
        <span style={{ fontWeight: 700, fontSize: '13px' }}>A+</span>
      </button>
      <button 
        className="btn-icon" 
        title="Diminuir Fonte (A-)" 
        disabled={!selectedNode}
        onClick={() => onUpdateSelected({ fontSize: Math.max((selectedNode?.fontSize || 14) - 2, 10) })}>
        <span style={{ fontWeight: 600, fontSize: '11px' }}>A-</span>
      </button>

      <div className="divider" />

      {/* Paleta rápida de 10 cores suaves */}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {PASTEL_COLORS.map((color, idx) => (
          <button
            key={idx}
            disabled={!selectedNode}
            onClick={() => onUpdateSelected({ color })}
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              backgroundColor: color,
              border: selectedNode?.color === color ? '2px solid #3B82F6' : '1px solid #CBD5E1',
              cursor: selectedNode ? 'pointer' : 'default',
              padding: 0
            }}
          />
        ))}
      </div>
    </header>
  );
}
