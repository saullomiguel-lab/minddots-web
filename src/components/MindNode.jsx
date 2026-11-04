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
  onPaste,
  onHeightSync
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(node.text || '');
  const editorRef = useRef(null);
  const nodeRef = useRef(null);
  const pasteFileRef = useRef(null);

  useEffect(() => {
    setEditText(node.text || '');
  }, [node.text]);

  useEffect(() => {
    if (nodeRef.current && onHeightSync) {
      const actualHeight = nodeRef.current.offsetHeight;
      if (actualHeight && Math.abs(actualHeight - (node.height || 0)) > 2) {
        onHeightSync(node.id, actualHeight);
      }
    }
  });

  useEffect(() => {
    if (isEditing && editorRef.current) {
      editorRef.current.focus();
      const val = editorRef.current.value;
      editorRef.current.setSelectionRange(val.length, val.length);
      editorRef.current.style.height = 'auto';
      editorRef.current.style.height = `${Math.max(editorRef.current.scrollHeight, 26)}px`;
    }
  }, [isEditing]);

  const finishEditing = () => {
    setIsEditing(false);
    onUpdateText(node.id, editText.trim());
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setEditText(node.text || '');
      setIsEditing(false);
    }
  };

  const handleInput = (e) => {
    setEditText(e.target.value);
    if (editorRef.current) {
      editorRef.current.style.height = 'auto';
      editorRef.current.style.height = `${Math.max(editorRef.current.scrollHeight, 26)}px`;
    }
  };

  // MECÂNICA NO COMPUTADOR: ARRASTE MESMO EM MODO DE TEXTO
  const handleMouseDownNode = (e) => {
    if (e.button !== 0) return;
    onSelect(e, node.id);

    // Se estiver editando E o clique foi especificamente dentro do texto:
    // permite a seleção natural de palavras
    if (isEditing && e.target === editorRef.current) {
      return;
    }

    // Se clicou na borda, padding, imagem ou alça de arraste: move normalmente!
    const startX = e.clientX;
    const startY = e.clientY;
    let hasMoved = false;

    const onMouseMove = (moveEvt) => {
      const dist = Math.hypot(moveEvt.clientX - startX, moveEvt.clientY - startY);
      if (dist > 4 && !hasMoved) {
        hasMoved = true;
        onStartDrag({ clientX: startX, clientY: startY }, node.id);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      // Se deu um clique estático (sem arrastar) fora do editor: abre edição
      if (!hasMoved && !isEditing) {
        setIsEditing(true);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // MECÂNICA NO CELULAR: ARRASTE NO TOUCH MESMO EM MODO DE TEXTO
  const handleTouchStartNode = (e) => {
    if (e.touches.length !== 1) return;
    onSelect(e, node.id);

    if (isEditing && e.target === editorRef.current) {
      return;
    }

    const t = e.touches[0];
    const startX = t.clientX;
    const startY = t.clientY;
    let hasMoved = false;

    const onTouchMove = (moveEvt) => {
      if (moveEvt.touches.length !== 1) return;
      const mt = moveEvt.touches[0];
      const dist = Math.hypot(mt.clientX - startX, mt.clientY - startY);
      if (dist > 6 && !hasMoved) {
        hasMoved = true;
        onStartDrag({ clientX: startX, clientY: startY }, node.id);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
      }
    };

    const onTouchEnd = () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      if (!hasMoved && !isEditing) {
        setIsEditing(true);
      }
    };

    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);
  };

  const handlePasteClick = async (e) => {
    e.stopPropagation();
    if (navigator.clipboard && navigator.clipboard.read) {
      try {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imgType = item.types.find((t) => t.startsWith('image/'));
          if (imgType) {
            const blob = await item.getType(imgType);
            const reader = new FileReader();
            reader.onload = (evt) => {
              onPaste(node.id, { imageData: evt.target.result });
            };
            reader.readAsDataURL(blob);
            return;
          }
          if (item.types.includes('text/plain')) {
            const textBlob = await item.getType('text/plain');
            const text = await textBlob.text();
            if (text && text.trim()) {
              onPaste(node.id, { text: (node.text ? node.text + '\n' : '') + text.trim() });
              return;
            }
          }
        }
      } catch (err) {
        console.warn('Leitura bloqueada:', err);
      }
    }

    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          if (/^https?:\/\/.*\.(jpeg|jpg|png|webp|gif|svg)($|\?)/i.test(text.trim())) {
            onPaste(node.id, { imageData: text.trim() });
            return;
          }
          onPaste(node.id, { text: (node.text ? node.text + '\n' : '') + text.trim() });
          return;
        }
      }
    } catch {
      pasteFileRef.current?.click();
    }
  };

  const handleManualImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        onPaste(node.id, { imageData: evt.target.result });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const safeX = Number(node.x) || 0;
  const safeY = Number(node.y) || 0;
  const placeholder = isRoot ? '💡 Ideia Principal' : 'Nova Ideia';
  const hasText = Boolean(editText && editText.trim().length > 0);
  const hasImage = Boolean(node.imageData);

  return (
    <div
      ref={nodeRef}
      style={{
        position: 'absolute',
        left: `${safeX}px`,
        top: `${safeY}px`,
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
        cursor: isEditing ? 'grab' : 'move', // Mostra a mãozinha de arraste nos respiros
        userSelect: isEditing ? 'text' : 'none',
        touchAction: 'none',
        zIndex: isSelected ? 20 : 5
      }}
      onMouseDown={handleMouseDownNode}
      onTouchStart={handleTouchStartNode}
    >
      {/* Alcinha discreta de arraste que surge no topo quando estiver editando texto */}
      {isEditing && (
        <div
          title="Arraste por aqui para mover o balão"
          style={{
            position: 'absolute',
            top: '3px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '32px',
            height: '4px',
            borderRadius: '2px',
            backgroundColor: '#CBD5E1',
            cursor: 'grab',
            pointerEvents: 'none'
          }}
        />
      )}

      {/* Botão Flutuante 📋 Colar */}
      {isSelected && !isEditing && (
        <>
          <button
            onClick={handlePasteClick}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            title="Colar texto ou imagem"
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
          <input
            type="file"
            ref={pasteFileRef}
            onChange={handleManualImageUpload}
            accept="image/*"
            style={{ display: 'none' }}
          />
        </>
      )}

      {/* 4 Portas Conectoras com "+" azul */}
      {isSelected &&
        [0, 1, 2, 3].map((portIdx) => {
          const positions = [
            { top: '-16px', left: '50%', transform: 'translateX(-50%)' },
            { right: '-16px', top: '50%', transform: 'translateY(-50%)' },
            { bottom: '-16px', left: '50%', transform: 'translateX(-50%)' },
            { left: '-16px', top: '50%', transform: 'translateY(-50%)' }
          ];
          return (
            <div
              key={portIdx}
              style={{
                position: 'absolute',
                ...positions[portIdx],
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'crosshair',
                touchAction: 'none',
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
              onTouchStart={(e) => {
                e.stopPropagation();
                const t = e.touches[0];
                onPortMouseDown({ clientX: t.clientX, clientY: t.clientY }, node.id, portIdx);
              }}
              title="Puxe para criar ou ligar a outro balão"
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

      {/* Redimensionamento nas Bordas */}
      {isSelected && (
        <>
          <div
            onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e, node.id, 'right'); }}
            onTouchStart={(e) => { e.stopPropagation(); const t = e.touches[0]; onResizeStart({ clientX: t.clientX, clientY: t.clientY }, node.id, 'right'); }}
            style={{ position: 'absolute', top: '8px', bottom: '8px', right: '-4px', width: '8px', cursor: 'ew-resize', zIndex: 30 }}
          />
          <div
            onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e, node.id, 'left'); }}
            onTouchStart={(e) => { e.stopPropagation(); const t = e.touches[0]; onResizeStart({ clientX: t.clientX, clientY: t.clientY }, node.id, 'left'); }}
            style={{ position: 'absolute', top: '8px', bottom: '8px', left: '-4px', width: '8px', cursor: 'ew-resize', zIndex: 30 }}
          />
          <div
            onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e, node.id, 'bottom'); }}
            onTouchStart={(e) => { e.stopPropagation(); const t = e.touches[0]; onResizeStart({ clientX: t.clientX, clientY: t.clientY }, node.id, 'bottom'); }}
            style={{ position: 'absolute', left: '8px', right: '8px', bottom: '-4px', height: '8px', cursor: 'ns-resize', zIndex: 30 }}
          />
          <div
            onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e, node.id, 'top'); }}
            onTouchStart={(e) => { e.stopPropagation(); const t = e.touches[0]; onResizeStart({ clientX: t.clientX, clientY: t.clientY }, node.id, 'top'); }}
            style={{ position: 'absolute', left: '8px', right: '8px', top: '-4px', height: '8px', cursor: 'ns-resize', zIndex: 30 }}
          />
          <div
            onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e, node.id, 'bottom-right'); }}
            onTouchStart={(e) => { e.stopPropagation(); const t = e.touches[0]; onResizeStart({ clientX: t.clientX, clientY: t.clientY }, node.id, 'bottom-right'); }}
            style={{ position: 'absolute', right: '-4px', bottom: '-4px', width: '12px', height: '12px', cursor: 'nwse-resize', zIndex: 32 }}
          />
        </>
      )}

      {/* Imagem Proporcional */}
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

      {/* Editor de Texto Multilinha */}
      {isEditing ? (
        <textarea
          ref={editorRef}
          value={editText}
          onChange={handleInput}
          onBlur={finishEditing}
          onKeyDown={handleKeyDown}
          placeholder={hasImage ? '' : placeholder}
          style={{
            width: '100%',
            minHeight: '26px',
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
            display: 'block',
            boxSizing: 'border-box',
            cursor: 'text' // Dentro do texto, o cursor é de digitação
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
