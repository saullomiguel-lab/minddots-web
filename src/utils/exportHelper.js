import { getPortPosition, getBezierPath } from '../constants';

// Abre a janela nativa do sistema operacional "Salvar como..."
export async function saveFileWithPicker(blob, suggestedName, mimeType, extension) {
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: `${extension.toUpperCase()} File`,
            accept: { [mimeType]: [`.${extension}`] }
          }
        ]
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Algoritmo que quebra o texto perfeitamente dentro da largura útil do balão (Word Wrap)
function wrapText(ctx, text, maxWidth) {
  if (!text) return [];
  const paragraphs = text.split('\n');
  const wrappedLines = [];

  paragraphs.forEach((paragraph) => {
    if (!paragraph.trim()) {
      wrappedLines.push('');
      return;
    }

    const words = paragraph.split(' ');
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine !== '') {
        wrappedLines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      wrappedLines.push(currentLine);
    }
  });

  return wrappedLines;
}

// Renderiza o mapa com enquadramento perfeito e alta resolução (2.5x)
export async function exportMapToJpg(nodes, connections, mapTitle = 'mapa-mental') {
  if (!nodes || nodes.length === 0) {
    alert('O mapa mental está vazio.');
    return;
  }

  // 1. Pré-carrega as imagens dos balões
  const loadedImages = {};
  await Promise.all(
    nodes.map((node) => {
      if (!node.imageData) return Promise.resolve();
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          loadedImages[node.id] = img;
          resolve();
        };
        img.onerror = () => resolve();
        img.src = node.imageData;
      });
    })
  );

  // 2. Mede a tipografia e calcula a altura exata necessária para cada balão
  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d');

  const nodesWithComputedLayout = nodes.map((node) => {
    const nw = Math.max(node.width || 170, 120);
    const fontSize = node.fontSize || 14;
    const lineHeight = fontSize * 1.4;
    measureCtx.font = `500 ${fontSize}px 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif`;

    const maxTextWidth = nw - 28; // desconta o padding lateral (14px de cada lado)
    const lines = wrapText(measureCtx, node.text || '', maxTextWidth);

    const img = loadedImages[node.id];
    let imgH = 0;
    if (img) {
      const maxImgW = nw - 28;
      const maxImgH = 180;
      const ratio = Math.min(maxImgW / img.width, maxImgH / img.height);
      imgH = img.height * ratio + 8; // altura da imagem + respiro
    }

    const textH = lines.length * lineHeight;
    // Padding: 12px topo + 20px base + conteúdo
    const neededHeight = 12 + imgH + textH + 20;
    const finalHeight = Math.max(node.height || 75, neededHeight, 60);

    return {
      ...node,
      width: nw,
      height: finalHeight,
      effectiveHeight: finalHeight,
      computedLines: lines,
      lineHeight,
      fontSize
    };
  });

  // 3. Calcula os limites do mapa inteiro com folga de segurança
  const padding = 70;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  nodesWithComputedLayout.forEach((n) => {
    if (n.x < minX) minX = n.x;
    if (n.x + n.width > maxX) maxX = n.x + n.width;
    if (n.y < minY) minY = n.y;
    if (n.y + n.effectiveHeight > maxY) maxY = n.y + n.effectiveHeight;
  });

  const contentW = Math.max(maxX - minX + padding * 2, 400);
  const contentH = Math.max(maxY - minY + padding * 2, 300);

  // Escala de alta densidade (2.5x) para textos cristalinos
  const scale = 2.5;

  const canvas = document.createElement('canvas');
  canvas.width = contentW * scale;
  canvas.height = contentH * scale;
  const ctx = canvas.getContext('2d');

  ctx.scale(scale, scale);

  // Fundo oficial do MindDots
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, contentW, contentH);

  // Grade suave de pontinhos
  ctx.fillStyle = '#CBD5E1';
  for (let x = 12; x < contentW; x += 24) {
    for (let y = 12; y < contentH; y += 24) {
      ctx.beginPath();
      ctx.arc(x, y, 0.75, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const offsetX = -minX + padding;
  const offsetY = -minY + padding;

  // 4. Desenha as conexões e pontas de seta com as posições ajustadas
  connections.forEach((conn) => {
    const fromNode = nodesWithComputedLayout.find((n) => n.id === conn.fromNodeId);
    const toNode = nodesWithComputedLayout.find((n) => n.id === conn.toNodeId);
    if (!fromNode || !toNode) return;

    const p1 = getPortPosition(fromNode, conn.fromPortIndex);
    const p2 = getPortPosition(toNode, conn.toPortIndex);

    const adjustedP1 = { x: p1.x + offsetX, y: p1.y + offsetY, normal: p1.normal };
    const adjustedP2 = { x: p2.x + offsetX, y: p2.y + offsetY, normal: p2.normal };

    const pathData = getBezierPath(adjustedP1, adjustedP2);

    ctx.save();
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    const path2D = new Path2D(pathData);
    ctx.stroke(path2D);

    const angle = adjustedP2.normal
      ? Math.atan2(-adjustedP2.normal.y, -adjustedP2.normal.x)
      : Math.atan2(adjustedP2.y - adjustedP1.y, adjustedP2.x - adjustedP1.x);

    ctx.translate(adjustedP2.x, adjustedP2.y);
    ctx.rotate(angle);
    ctx.fillStyle = '#94A3B8';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-9, -4.5);
    ctx.lineTo(-9, 4.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });

  // 5. Desenha os balões, imagens e o texto quebrado com perfeição
  nodesWithComputedLayout.forEach((node) => {
    const nx = node.x + offsetX;
    const ny = node.y + offsetY;
    const nw = node.width;
    const nh = node.effectiveHeight;

    // Sombra suave do balão
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.06)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;

    // Corpo do balão
    ctx.fillStyle = node.backgroundColor || '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(nx, ny, nw, nh, 10);
    ctx.fill();
    ctx.restore();

    // Borda do balão
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(nx, ny, nw, nh, 10);
    ctx.stroke();

    let textTop = ny + 12;

    // Imagem preservando proporção original
    const img = loadedImages[node.id];
    if (img) {
      const maxImgW = nw - 28;
      const maxImgH = 180;
      const ratio = Math.min(maxImgW / img.width, maxImgH / img.height);
      const renderW = img.width * ratio;
      const renderH = img.height * ratio;
      const imgX = nx + (nw - renderW) / 2;
      const imgY = ny + 12;

      ctx.drawImage(img, imgX, imgY, renderW, renderH);
      textTop = imgY + renderH + 8;
    }

    // Texto com quebra de linha rigorosamente contida dentro do balão
    if (node.computedLines.length > 0) {
      ctx.fillStyle = node.textColor || '#1E293B';
      ctx.font = `500 ${node.fontSize}px 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif`;
      ctx.textBaseline = 'top';

      const align = (node.textAlignment || 'Left').toLowerCase();

      node.computedLines.forEach((line, idx) => {
        let lineX = nx + 14;
        if (align === 'center') {
          ctx.textAlign = 'center';
          lineX = nx + nw / 2;
        } else if (align === 'right') {
          ctx.textAlign = 'right';
          lineX = nx + nw - 14;
        } else {
          ctx.textAlign = 'left';
        }
        ctx.fillText(line, lineX, textTop + idx * node.lineHeight);
      });
    }
  });

  // 6. Gera o arquivo JPG com qualidade máxima e abre o "Salvar como..."
  canvas.toBlob(
    async (blob) => {
      if (blob) {
        const cleanName = mapTitle.toLowerCase().replace(/[^a-z0-9]/g, '-');
        await saveFileWithPicker(blob, `${cleanName}.jpg`, 'image/jpeg', 'jpg');
      }
    },
    'image/jpeg',
    0.95
  );
}
