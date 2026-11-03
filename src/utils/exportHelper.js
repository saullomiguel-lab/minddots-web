import { getPortPosition, getBezierPath, getBezierControlPoints } from '../constants';

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

// Algoritmo blindado: quebra por palavras e por caracteres (impossível vazar horizontalmente)
function wrapTextLines(ctx, text, maxWidth) {
  if (!text) return [];
  const paragraphs = text.split('\n');
  const result = [];

  paragraphs.forEach((paragraph) => {
    if (!paragraph.trim()) {
      result.push({ text: '', isLastInParagraph: true });
      return;
    }

    const words = paragraph.split(/\s+/).filter(Boolean);
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      let word = words[i];

      // Se uma única palavra for maior que a largura do balão (ex: links), fatia por caractere
      if (ctx.measureText(word).width > maxWidth) {
        if (currentLine) {
          result.push({ text: currentLine, isLastInParagraph: false });
          currentLine = '';
        }

        let chunk = '';
        for (let c = 0; c < word.length; c++) {
          const testChunk = chunk + word[c];
          if (ctx.measureText(testChunk).width > maxWidth && chunk !== '') {
            result.push({ text: chunk, isLastInParagraph: false });
            chunk = word[c];
          } else {
            chunk = testChunk;
          }
        }
        currentLine = chunk;
        continue;
      }

      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = ctx.measureText(testLine).width;

      if (testWidth > maxWidth && currentLine !== '') {
        result.push({ text: currentLine, isLastInParagraph: false });
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      result.push({ text: currentLine, isLastInParagraph: true });
    }
  });

  return result;
}

// Desenha a linha respeitando milimetricamente a largura útil (sem esticar além do limite)
function drawAlignedLine(ctx, line, x, y, maxW, align, isLastInParagraph) {
  if (!line || !line.trim()) return;

  if (align === 'center') {
    ctx.textAlign = 'center';
    ctx.fillText(line, x + maxW / 2, y);
  } else if (align === 'right') {
    ctx.textAlign = 'right';
    ctx.fillText(line, x + maxW, y);
  } else if (align === 'justify' && !isLastInParagraph) {
    const words = line.trim().split(/\s+/);
    if (words.length <= 1) {
      ctx.textAlign = 'left';
      ctx.fillText(line, x, y);
    } else {
      let totalWordsWidth = 0;
      const wordWidths = words.map((w) => {
        const wWidth = ctx.measureText(w).width;
        totalWordsWidth += wWidth;
        return wWidth;
      });

      const remainingSpace = maxW - totalWordsWidth;
      const spacePerGap = remainingSpace / (words.length - 1);

      // Trava de segurança: só distribui espaço se não estourar a linha
      if (spacePerGap > 0 && spacePerGap < 35) {
        ctx.textAlign = 'left';
        let currentX = x;
        words.forEach((w, i) => {
          ctx.fillText(w, currentX, y);
          currentX += wordWidths[i] + spacePerGap;
        });
      } else {
        ctx.textAlign = 'left';
        ctx.fillText(line, x, y);
      }
    }
  } else {
    ctx.textAlign = 'left';
    ctx.fillText(line, x, y);
  }
}

// Renderiza todo o mapa em JPG com alta resolução (2.5x) e proteção total
export async function exportMapToJpg(nodes, connections, fullTitle = 'mapa-mental') {
  if (!nodes || nodes.length === 0) {
    alert('O mapa mental está vazio.');
    return;
  }

  // 1. Pré-carrega todas as imagens
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

  // 2. Mede tipografia e calcula a altura real necessária de cada balão
  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d');

  const nodesWithComputedLayout = nodes.map((node) => {
    const nw = Math.max(node.width || 170, 120);
    const fontSize = node.fontSize || 14;
    const lineHeight = fontSize * 1.45;

    measureCtx.font = `500 ${fontSize}px 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif`;

    const paddingX = 14;
    // Margem interna de segurança extra (-6px) para evitar qualquer toque na borda
    const maxTextWidth = Math.max(nw - (paddingX * 2) - 6, 80);
    const wrappedLines = wrapTextLines(measureCtx, node.text || '', maxTextWidth);

    const img = loadedImages[node.id];
    let imgH = 0;
    if (img) {
      const maxImgW = maxTextWidth;
      const maxImgH = 180;
      const ratio = Math.min(maxImgW / img.width, maxImgH / img.height);
      imgH = (img.height * ratio) + 10;
    }

    const textH = wrappedLines.length * lineHeight;
    // Altura calculada com 26px de folga na base
    const neededHeight = 14 + imgH + textH + 26;
    const finalHeight = Math.max(node.height || 75, neededHeight, 60);

    return {
      ...node,
      width: nw,
      height: finalHeight,
      effectiveHeight: finalHeight,
      computedLines: wrappedLines,
      lineHeight,
      fontSize,
      maxTextWidth,
      paddingX,
      imgH
    };
  });

  // 3. Limites totais do mapa
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

  const scale = 2.5;
  const canvas = document.createElement('canvas');
  canvas.width = contentW * scale;
  canvas.height = contentH * scale;
  const ctx = canvas.getContext('2d');

  ctx.scale(scale, scale);

  // Fundo do mapa
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

  // 4. Desenha as conexões e pontas de seta
  connections.forEach((conn) => {
    const fromNode = nodesWithComputedLayout.find((n) => n.id === conn.fromNodeId);
    const toNode = nodesWithComputedLayout.find((n) => n.id === conn.toNodeId);
    if (!fromNode || !toNode) return;

    const p1 = getPortPosition(fromNode, conn.fromPortIndex);
    const p2 = getPortPosition(toNode, conn.toPortIndex);

    const adjustedP1 = { x: p1.x + offsetX, y: p1.y + offsetY, normal: p1.normal };
    const adjustedP2 = { x: p2.x + offsetX, y: p2.y + offsetY, normal: p2.normal };

    const pathData = getBezierPath(adjustedP1, adjustedP2, conn);

    ctx.save();
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.stroke(new Path2D(pathData));

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

  // 5. Desenha os balões com proteção de recorte (ctx.clip)
  nodesWithComputedLayout.forEach((node) => {
    const nx = node.x + offsetX;
    const ny = node.y + offsetY;
    const nw = node.width;
    const nh = node.effectiveHeight;

    // Sombra suave externa
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.06)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;

    // Fundo do balão
    ctx.fillStyle = node.backgroundColor || '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(nx, ny, nw, nh, 10);
    ctx.fill();
    ctx.restore();

    // Borda do balão
    ctx.save();
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(nx, ny, nw, nh, 10);
    ctx.stroke();
    ctx.restore();

    // ESCUDO DE RECORTE (CLIPPING): Nada pode ser desenhado fora deste retângulo
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(nx, ny, nw, nh, 10);
    ctx.clip();

    let textTop = ny + 12;

    // Imagem proporcional
    const img = loadedImages[node.id];
    if (img) {
      const maxImgW = node.maxTextWidth;
      const maxImgH = 180;
      const ratio = Math.min(maxImgW / img.width, maxImgH / img.height);
      const renderW = img.width * ratio;
      const renderH = img.height * ratio;
      const imgX = nx + (nw - renderW) / 2;
      const imgY = ny + 12;

      ctx.drawImage(img, imgX, imgY, renderW, renderH);
      textTop = imgY + renderH + 8;
    }

    // Texto rigorosamente contido
    if (node.computedLines.length > 0) {
      ctx.fillStyle = node.textColor || '#1E293B';
      ctx.font = `500 ${node.fontSize}px 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif`;
      ctx.textBaseline = 'top';

      const align = (node.textAlignment || 'Left').toLowerCase();
      const textStartX = nx + node.paddingX + 3; // +3px centraliza o respiro interno

      node.computedLines.forEach((item, idx) => {
        const lineY = textTop + (idx * node.lineHeight);
        drawAlignedLine(ctx, item.text, textStartX, lineY, node.maxTextWidth, align, item.isLastInParagraph);
      });
    }

    // Fecha o escudo de recorte
    ctx.restore();
  });

  // 6. Converte para JPG preservando o nome original
  canvas.toBlob(
    async (blob) => {
      if (blob) {
        const cleanName = fullTitle.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
        await saveFileWithPicker(blob, `${cleanName}.jpg`, 'image/jpeg', 0.95);
      }
    },
    'image/jpeg',
    0.95
  );
}
