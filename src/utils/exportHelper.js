import { getPortPosition, getBezierPath } from '../constants';

export async function saveFileWithPicker(blob, suggestedName, mimeType, extension) {
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{ description: `${extension.toUpperCase()} File`, accept: { [mimeType]: [`.${extension}`] } }]
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

function wrapText(ctx, text, maxWidth) {
  if (!text) return [];
  const paragraphs = text.split('\n');
  const wrappedLines = [];
  paragraphs.forEach((paragraph) => {
    if (!paragraph.trim()) { wrappedLines.push(''); return; }
    const words = paragraph.split(' ');
    let currentLine = '';
    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine !== '') {
        wrappedLines.push(currentLine); currentLine = words[i];
      } else { currentLine = testLine; }
    }
    if (currentLine) wrappedLines.push(currentLine);
  });
  return wrappedLines;
}

export async function exportMapToJpg(nodes, connections, mapTitle = 'mapa-mental') {
  if (!nodes || nodes.length === 0) { alert('O mapa mental está vazio.'); return; }
  const loadedImages = {};
  await Promise.all(
    nodes.map((node) => {
      if (!node.imageData) return Promise.resolve();
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => { loadedImages[node.id] = img; resolve(); };
        img.onerror = () => resolve();
        img.src = node.imageData;
      });
    })
  );

  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d');
  const nodesWithComputedLayout = nodes.map((node) => {
    const nw = Math.max(node.width || 170, 120);
    const fontSize = node.fontSize || 14;
    const lineHeight = fontSize * 1.4;
    measureCtx.font = `500 ${fontSize}px 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif`;
    const maxTextWidth = nw - 28;
    const lines = wrapText(measureCtx, node.text || '', maxTextWidth);
    const img = loadedImages[node.id];
    let imgH = 0;
    if (img) {
      const ratio = Math.min((nw - 28) / img.width, 180 / img.height);
      imgH = img.height * ratio + 8;
    }
    const textH = lines.length * lineHeight;
    const finalHeight = Math.max(node.height || 75, 12 + imgH + textH + 20, 60);
    return { ...node, width: nw, height: finalHeight, effectiveHeight: finalHeight, computedLines: lines, lineHeight, fontSize };
  });

  const padding = 70;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  nodesWithComputedLayout.forEach((n) => {
    if (n.x < minX) minX = n.x; if (n.x + n.width > maxX) maxX = n.x + n.width;
    if (n.y < minY) minY = n.y; if (n.y + n.effectiveHeight > maxY) maxY = n.y + n.effectiveHeight;
  });

  const contentW = Math.max(maxX - minX + padding * 2, 400);
  const contentH = Math.max(maxY - minY + padding * 2, 300);
  const scale = 2.5;

  const canvas = document.createElement('canvas');
  canvas.width = contentW * scale; canvas.height = contentH * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  ctx.fillStyle = '#F8FAFC'; ctx.fillRect(0, 0, contentW, contentH);
  ctx.fillStyle = '#CBD5E1';
  for (let x = 12; x < contentW; x += 24) {
    for (let y = 12; y < contentH; y += 24) { ctx.beginPath(); ctx.arc(x, y, 0.75, 0, Math.PI * 2); ctx.fill(); }
  }

  const offsetX = -minX + padding; const offsetY = -minY + padding;

  connections.forEach((conn) => {
    const fromNode = nodesWithComputedLayout.find((n) => n.id === conn.fromNodeId);
    const toNode = nodesWithComputedLayout.find((n) => n.id === conn.toNodeId);
    if (!fromNode || !toNode) return;
    const p1 = getPortPosition(fromNode, conn.fromPortIndex);
    const p2 = getPortPosition(toNode, conn.toPortIndex);
    const adjustedP1 = { x: p1.x + offsetX, y: p1.y + offsetY, normal: p1.normal };
    const adjustedP2 = { x: p2.x + offsetX, y: p2.y + offsetY, normal: p2.normal };

    const pathData = getBezierPath(adjustedP1, adjustedP2, conn);

    ctx.save(); ctx.strokeStyle = '#94A3B8'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.stroke(new Path2D(pathData));

    const angle = adjustedP2.normal ? Math.atan2(-adjustedP2.normal.y, -adjustedP2.normal.x) : Math.atan2(adjustedP2.y - adjustedP1.y, adjustedP2.x - adjustedP1.x);
    ctx.translate(adjustedP2.x, adjustedP2.y); ctx.rotate(angle); ctx.fillStyle = '#94A3B8';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-9, -4.5); ctx.lineTo(-9, 4.5); ctx.closePath(); ctx.fill(); ctx.restore();
  });

  nodesWithComputedLayout.forEach((node) => {
    const nx = node.x + offsetX; const ny = node.y + offsetY; const nw = node.width; const nh = node.effectiveHeight;
    ctx.save(); ctx.shadowColor = 'rgba(0, 0, 0, 0.06)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
    ctx.fillStyle = node.backgroundColor || '#FFFFFF'; ctx.beginPath(); ctx.roundRect(nx, ny, nw, nh, 10); ctx.fill(); ctx.restore();
    ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(nx, ny, nw, nh, 10); ctx.stroke();

    let textTop = ny + 12;
    const img = loadedImages[node.id];
    if (img) {
      const ratio = Math.min((nw - 28) / img.width, 180 / img.height);
      const renderW = img.width * ratio; const renderH = img.height * ratio;
      const imgX = nx + (nw - renderW) / 2; const imgY = ny + 12;
      ctx.drawImage(img, imgX, imgY, renderW, renderH); textTop = imgY + renderH + 8;
    }
    if (node.computedLines.length > 0) {
      ctx.fillStyle = node.textColor || '#1E293B'; ctx.font = `500 ${node.fontSize}px 'Segoe UI', sans-serif`; ctx.textBaseline = 'top';
      const align = (node.textAlignment || 'Left').toLowerCase();
      node.computedLines.forEach((line, idx) => {
        let lineX = nx + 14;
        if (align === 'center') { ctx.textAlign = 'center'; lineX = nx + nw / 2; } 
        else if (align === 'right') { ctx.textAlign = 'right'; lineX = nx + nw - 14; } 
        else { ctx.textAlign = 'left'; }
        ctx.fillText(line, lineX, textTop + idx * node.lineHeight);
      });
    }
  });

  canvas.toBlob(async (blob) => {
    if (blob) await saveFileWithPicker(blob, `${mapTitle}.jpg`, 'image/jpeg', 'jpg');
  }, 'image/jpeg', 0.95);
}
