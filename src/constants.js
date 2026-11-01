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
    case 0: return { x: node.x + w / 2, y: node.y - 8, normal: { x: 0, y: -1 } };     // Topo
    case 1: return { x: node.x + w + 8, y: node.y + h / 2, normal: { x: 1, y: 0 } }; // Direita
    case 2: return { x: node.x + w / 2, y: node.y + h + 8, normal: { x: 0, y: 1 } }; // Base
    case 3: return { x: node.x - 8, y: node.y + h / 2, normal: { x: -1, y: 0 } };    // Esquerda
    default: return { x: node.x + w / 2, y: node.y + h / 2, normal: { x: 1, y: 0 } };
  }
}

// Curva suave de Bézier que respeita os vetores de entrada para a ponta da seta apontar perfeitamente
export function getBezierPath(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.hypot(dx, dy);
  const curvature = Math.min(Math.max(dist * 0.45, 35), 220);

  const n1 = p1.normal || { x: dx >= 0 ? 1 : -1, y: 0 };
  const n2 = p2.normal || { x: dx >= 0 ? -1 : 1, y: 0 };

  const cp1x = p1.x + n1.x * curvature;
  const cp1y = p1.y + n1.y * curvature;
  const cp2x = p2.x + n2.x * curvature;
  const cp2y = p2.y + n2.y * curvature;

  return `M ${p1.x} ${p1.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
}
