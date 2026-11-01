// Paleta oficial de 10 cores pastéis suaves da especificação
export const PASTEL_COLORS = [
  '#FFFFFF', // Branco Padrão
  '#F1F5F9', // Cinza Claro
  '#FEF08A', // Amarelo Suave
  '#FED7AA', // Laranja Pastel
  '#FCE7F3', // Rosa Pastel
  '#E9D5FF', // Roxo Claro
  '#DBEAFE', // Azul Suave
  '#DCFCE7', // Verde Claro
  '#A7F3D0', // Menta
  '#FECDD3'  // Coral
];

// Cálculo das 4 Portas posicionadas 8px FORA do retângulo
// 0: Topo | 1: Direita | 2: Base | 3: Esquerda
export function getPortPosition(node, portIndex) {
  const w = Math.max(node.width || 170, 120);
  const h = Math.max(node.height || 75, 60);

  switch (portIndex) {
    case 0: return { x: node.x + w / 2, y: node.y - 8, normal: { x: 0, y: -1 } };     // Topo (sai pra cima)
    case 1: return { x: node.x + w + 8, y: node.y + h / 2, normal: { x: 1, y: 0 } }; // Direita (sai pra direita)
    case 2: return { x: node.x + w / 2, y: node.y + h + 8, normal: { x: 0, y: 1 } }; // Base (sai pra baixo)
    case 3: return { x: node.x - 8, y: node.y + h / 2, normal: { x: -1, y: 0 } };    // Esquerda (sai pra esquerda)
    default: return { x: node.x + w / 2, y: node.y + h / 2, normal: { x: 0, y: 0 } };
  }
}

// Curva de Bézier suave que se adapta dinamicamente ao ângulo real (Vertical e Horizontal)
export function getBezierPath(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.hypot(dx, dy);
  const curvature = Math.min(Math.max(dist * 0.45, 30), 220);

  // Direção de saída da porta de origem
  const n1 = p1.normal || (Math.abs(dx) > Math.abs(dy) ? { x: dx >= 0 ? 1 : -1, y: 0 } : { x: 0, y: dy >= 0 ? 1 : -1 });

  // Direção de entrada na porta de destino
  let n2;
  if (p2.normal) {
    n2 = p2.normal;
  } else {
    // Durante o arraste com o mouse: aponta exatamente na direção em que o cursor está se movendo
    const angle = Math.atan2(dy, dx);
    n2 = { x: -Math.cos(angle), y: -Math.sin(angle) };
  }

  const cp1x = p1.x + n1.x * curvature;
  const cp1y = p1.y + n1.y * curvature;
  const cp2x = p2.x + n2.x * curvature;
  const cp2y = p2.y + n2.y * curvature;

  return `M ${p1.x} ${p1.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
}
