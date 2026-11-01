export const PASTEL_COLORS = [
  '#FFFFFF', '#F1F5F9', '#FEF08A', '#FED7AA', '#FCE7F3', 
  '#E9D5FF', '#DBEAFE', '#DCFCE7', '#A7F3D0', '#FECDD3'
];

export function getPortPosition(node, portIndex) {
  const w = Math.max(node.width || 170, 120);
  const h = Math.max(node.height || 75, 60);

  switch (portIndex) {
    case 0: return { x: node.x + w / 2, y: node.y - 8, normal: { x: 0, y: -1 } };     
    case 1: return { x: node.x + w + 8, y: node.y + h / 2, normal: { x: 1, y: 0 } }; 
    case 2: return { x: node.x + w / 2, y: node.y + h + 8, normal: { x: 0, y: 1 } }; 
    case 3: return { x: node.x - 8, y: node.y + h / 2, normal: { x: -1, y: 0 } };    
    default: return { x: node.x + w / 2, y: node.y + h / 2, normal: { x: 0, y: 0 } };
  }
}

// Extrai as coordenadas dos Pontos de Controle (bolinhas do meio)
export function getBezierControlPoints(p1, p2, conn = null) {
  // Se o usuário personalizou a curva, usamos os valores relativos dele
  if (conn && conn.cp1Offset && conn.cp2Offset) {
    return {
      cp1: { x: p1.x + conn.cp1Offset.dx, y: p1.y + conn.cp1Offset.dy },
      cp2: { x: p2.x + conn.cp2Offset.dx, y: p2.y + conn.cp2Offset.dy }
    };
  }

  // Curvatura automática padrão
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.hypot(dx, dy);
  const curvature = Math.min(Math.max(dist * 0.45, 30), 220);

  const n1 = p1.normal || (Math.abs(dx) > Math.abs(dy) ? { x: dx >= 0 ? 1 : -1, y: 0 } : { x: 0, y: dy >= 0 ? 1 : -1 });
  let n2;
  if (p2.normal) {
    n2 = p2.normal;
  } else {
    const angle = Math.atan2(dy, dx);
    n2 = { x: -Math.cos(angle), y: -Math.sin(angle) };
  }

  return {
    cp1: { x: p1.x + n1.x * curvature, y: p1.y + n1.y * curvature },
    cp2: { x: p2.x + n2.x * curvature, y: p2.y + n2.y * curvature }
  };
}

// Retorna o código SVG da curva final
export function getBezierPath(p1, p2, conn = null) {
  const { cp1, cp2 } = getBezierControlPoints(p1, p2, conn);
  return `M ${p1.x} ${p1.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${p2.x} ${p2.y}`;
}
