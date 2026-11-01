import React, { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';

export default function MindNode({
  node,
  isSelected,
  isRoot,
  onSelect,
  onStartDrag,
  onPortMouseDown,
  onPortMouseUp,
  onResizeStart,
  onUpdateText,
  onPaste
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(node.text || '');
  const editorRef = useRef(null);

  useEffect(() => {
    setEditText(node.text || '');
  }, [node.text]);

  useEffect(() => {
    if (isEditing && editorRef.current) {
      editorRef.current.focus();
      const val = editorRef.current.value;
      editorRef.current.setSelectionRange(val.length, val.length);
    }
  }, [isEditing]);

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const finishEditing = () => {
    setIsEditing(false);
    onUpdateText(node.id, editText.trim());
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      finishEditing();
    } else if (e.key === 'Escape') {
      setEditText(node.text || '');
      setIsEditing(false);
    }
  };

  const handleInput = (e) => {
    setEditText(e.target.value);
    if (editorRef.current) {
      editorRef.current.style.height = 'auto';
      editorRef.current.style.height = `${editorRef.current.scrollHeight}px`;
    }
  };

  // Leitura robusta da área de transferência (Imagens e Textos)
  const handlePasteClick = async (e) => {
    e.stopPropagation();

    // 1. Tenta leitura avançada via navigator.clipboard
    if (navigator.clipboard) {
      try {
        if (navigator.clipboard.read) {
          const items = await navigator.clipboard.read();
          for (const item of items) {
            // Verifica se há imagem
            const imageType = item.types.find((t) => t.startsWith('image/'));
            if (imageType) {
              const blob = await item.getType(imageType);
              const reader = new FileReader();
              reader.onload = (evt) => {
                onPaste(node.id, { imageData: evt.target.result });
              };
              reader.readAsDataURL(blob);
              return;
            }

            // Verifica se há texto simples no item
            if (item.types.includes('text/plain')) {
              const textBlob = await item.getType('text/plain');
              const text = await textBlob.text();
              if (text && text.trim()) {
                onPaste(node.id, { text: (node.text ? node.text + '\n' : '') + text.trim() });
                return;
              }
            }
          }
        }
      } catch (err) {
        console.warn('Tentativa com clipboard.read() falhou, testando readText():', err);
      }

      // 2. Fallback direto para texto se o navegador restringir leitura de arquivos
      try {
        if (navigator.clipboard.readText) {
          const text = await navigator.clipboard.readText();
          if (text && text.trim()) {
            onPaste(node.id, { text: (node.text ? node.text + '\n' : '') + text.trim() });
            return;
          }
        }
      } catch (textErr) {
        console.warn('Permissão de área de transferência restrita pelo navegador:', textErr);
      }
    }
  };

  const placeholder = isRoot ? '💡 Ideia Principal' : 'Nova Ideia';
  const hasText = Boolean(editText && editText.trim().length > 0);
  const hasImage = Boolean(node.imageData);

  return (
    <div
      style={{
        position: 'absolute',
        left: `${node.x}px`,
        top: `${node.y}px`,
        width: `${Math.max(node.width || 170, 120)}px`,
        minHeight: `${Math.max(node.height || 75, 60)}px`,
        backgroundColor: node.backgroundColor || '#FFFFFF',
        borderRadius: '10px',
        border: isSelected ? '2px solid #2563EB' : '1.5px solid #E2E8F0',
        boxShadow: isSelected
          ? '0 0 0 3px rgba(37, 99, 235, 0.2), 0 4px 12px rgba(0,0,0,0.08)'
          : '0 2px 8px rgba(0,0,0,0.05)',
        padding: '12px 14px 20px 14px',
        boxSizing: 'border-box',
        cursor: isEditing ? 'text' : 'move',
        userSelect: isEditing ? 'text' : 'none',
        zIndex: isSelected ? 20 : 5
      }}
      onMouseDown={(e) => {
        if (e.button === 0 && !isEditing) {
          onSelect(e, node.id);
          onStartDrag(e, node.id);
        }
      }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Botão Flutuante 📋 Colar */}
      {isSelected && !isEditing && (
        <button
          onClick={handlePasteClick}
          onMouseDown={(e) => e.stopPropagation()}
          title="Colar texto ou imagem da área de transferência"
          style={{
            position: 'absolute',
            top: '-26px',
            left: '0px',
            background: '#1E293B',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            padding: '3px 9px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            zIndex: 35
          }}
        >
          📋 Colar
        </button>
      )}

      {/* 4 Portas Conectoras com "+" branco no meio */}
      {isSelected &&
        [0, 1, 2, 3].map((portIdx) => {
          const positions = [
            { top: '-11px', left: '50%', transform: 'translateX(-50%)' },
            { right: '-11px', top: '50%', transform: 'translateY(-50%)' },
            { bottom: '-11px', left: '50%', transform: 'translateX(-50%)' },
            { left: '-11px', top: '50%', transform: 'translateY(-50%)' }
          ];
          return (
            <div
              key={portIdx}
              style={{
                position: 'absolute',
                ...positions[portIdx],
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'crosshair',
                zIndex: 40
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                onPortMouseDown(e, node.id, portIdx);
              }}
              onMouseUp={(e) => {
                e.stopPropagation();
                onPortMouseUp(e, node.id, portIdx);
              }}
              title="Puxe para criar um novo balão"
            >
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: '#2563EB',
                  border: '1.5px solid #FFFFFF',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none'
                }}
              >
                <Plus size={10} color="#FFFFFF" strokeWidth={3.5} />
              </div>
            </div>
          );
        })}

      {/* Ajuste de tamanho clicando em qualquer linha da borda */}
      {isSelected && (
        <>
          <div
            onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e, node.id, 'right'); }}
            style={{ position: 'absolute', top: '8px', bottom: '8px', right: '-4px', width: '8px', cursor: 'ew-resize', zIndex: 30 }}
            title="Arraste a linha para redimensionar"
          />
          <div
            onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e, node.id, 'left'); }}
            style={{ position: 'absolute', top: '8px', bottom: '8px', left: '-4px', width: '8px', cursor: 'ew-resize', zIndex: 30 }}
            title="Arraste a linha para redimensionar"
          />
          <div
            onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e, node.id, 'bottom'); }}
            style={{ position: 'absolute', left: '8px', right: '8px', bottom: '-4px', height: '8px', cursor: 'ns-resize', zIndex: 30 }}
            title="Arraste a linha para redimensionar"
          />
          <div
            onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e, node.id, 'top'); }}
            style={{ position: 'absolute', left: '8px', right: '8px', top: '-4px', height: '8px', cursor: 'ns-resize', zIndex: 30 }}
            title="Arraste a linha para redimensionar"
          />
          <div
            onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e, node.id, 'bottom-right'); }}
            style={{ position: 'absolute', right: '-4px', bottom: '-4px', width: '12px', height: '12px', cursor: 'nwse-resize', zIndex: 32 }}
          />
          <div
            onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e, node.id, 'bottom-left'); }}
            style={{ position: 'absolute', left: '-4px', bottom: '-4px', width: '12px', height: '12px', cursor: 'nesw-resize', zIndex: 32 }}
          />
        </>
      )}

      {/* Imagem Proporcional sem distorção */}
      {hasImage && (
        <img
          src={node.imageData}
          alt=""
          style={{
            width: '100%',
            height: 'auto',
            maxHeight: '260px',
            objectFit: 'contain',
            borderRadius: '6px',
            marginBottom: hasText || isEditing ? '8px' : '0px',
            display: 'block',
            pointerEvents: 'none'
          }}
        />
      )}

      {/* Editor de Texto In-Place (rente e abaixo da imagem) */}
      {isEditing ? (
        <textarea
          ref={editorRef}
          value={editText}
          onChange={handleInput}
          onBlur={finishEditing}
          onKeyDown={handleKeyDown}
          placeholder={hasImage ? '' : placeholder}
          rows={1}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            overflow: 'hidden',
            padding: 0,
            margin: 0,
            fontSize: `${node.fontSize || 14}px`,
            textAlign: (node.textAlignment || 'left').toLowerCase(),
            color: node.textColor || '#1E293B',
            fontFamily: 'inherit',
            lineHeight: '1.4',
            display: 'block'
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            fontSize: `${node.fontSize || 14}px`,
            textAlign: (node.textAlignment || 'left').toLowerCase(),
            color: hasText ? node.textColor || '#1E293B' : '#94A3B8',
            lineHeight: '1.4',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
            minHeight: hasImage ? '0px' : '20px'
          }}
        >
          {hasText ? editText : hasImage ? '' : placeholder}
        </div>
      )}
    </div>
  );
}
