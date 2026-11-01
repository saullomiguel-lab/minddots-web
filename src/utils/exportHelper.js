import { getPortPosition, getBezierPath } from '../constants';

// Abre a janela nativa do sistema operacional "Salvar como..." (Chrome, Edge, Opera)
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
      if (err.name === 'AbortError') return; // Usuário cancelou a janela
    }
  }

  // Fallback para navegadores sem suporte ao showSaveFilePicker
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Renderiza todo o mapa em um Canvas de altíssima densidade e exporta em JPG legível
export async function exportMapToJpg(nodes, connections, mapTitle = 'mapa-mental') {
  if (!nodes || nodes.length === 0) {
    alert('O mapa mental está vazio.');
    return;
  }

  // 1. Calcula os limites do mapa inteiro
  const padding = 70;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  nodes.forEach((n) => {
    const w = n.width || 170;
    const h = n.height || 75;
    if (n.x < minX) minX = n.x;
    if (n.x + w > maxX) maxX = n.x + w;
    if (n.y < minY) minY = n.y;
    if (n.y + h > maxY) maxY = n.y + h;
  });

  const contentW = Math.max(maxX - minX + padding * 2, 400);
  const contentH = Math.max(maxY - minY + padding * 2, 300);

  // Escala de alta densidade (2.5x) para textos ficarem cristalinos e legíveis
  const scale = 2.5;

  const canvas = document.createElement('canvas');
  canvas.width = contentW * scale;
  canvas.height = contentH * scale;
  const ctx = canvas.getContext('2d');

  ctx.scale(scale, scale);

  // Fundo oficial do MindDots
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, contentW, contentH);

  // Grade sutil de fundo
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

  // 2. Pré-carrega as imagens dos balões
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

  // 3. Desenha as conexões e pontas de seta
  connections.forEach((conn) => {
    const fromNode = nodes.find((n) => n.id === conn.fromNodeId);
    const toNode = nodes.find((n) => n.id === conn.toNodeId);
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

    // Ponta de seta desenhada tangencialmente
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

  // 4. Desenha os balões, textos e imagens
  nodes.forEach((node) => {
    const nx = node.x + offsetX;
    const ny = node.y + offsetY;
    const nw = node.width || 170;
    const nh = node.height || 75;

    // Sombra suave do balão
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.06)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;

    // Corpo do balão com cantos arredondados
    ctx.fillStyle = node.backgroundColor || '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(nx, ny, nw, nh, 10);
    ctx.fill();
    ctx.restore();

    // Borda
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    let textTop = ny + 14;

    // Imagem preservando proporção
    const img = loadedImages[node.id];
    if (img) {
      const maxImgW = nw - 28;
      const maxImgH = Math.min(nh - 40, 180);
      const ratio = Math.min(maxImgW / img.width, maxImgH / img.height);
      const renderW = img.width * ratio;
      const renderH = img.height * ratio;
      const imgX = nx + (nw - renderW) / 2;
      const imgY = ny + 12;

      ctx.drawImage(img, imgX, imgY, renderW, renderH);
      textTop = imgY + renderH + 8;
    }

    // Texto multilinha legível
    const text = node.text || '';
    if (text.trim().length > 0) {
      const fontSize = node.fontSize || 14;
      ctx.fillStyle = node.textColor || '#1E293B';
      ctx.font = `500 ${fontSize}px 'Segoe UI', Tahoma, sans-serif`;
      ctx.textBaseline = 'top';

      const align = (node.textAlignment || 'Left').toLowerCase();
      const lines = text.split('\n');
      const lineHeight = fontSize * 1.4;

      lines.forEach((line, idx) => {
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
        ctx.fillText(line, lineX, textTop + idx * lineHeight);
      });
    }
  });

  // 5. Converte para JPG e abre a tela "Salvar como..."
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
