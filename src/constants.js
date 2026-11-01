// Paleta rápida de 10 cores suaves (fiel ao app original)
export const PASTEL_COLORS = [
  '#FFFFFF', // Branco puro
  '#FEF3C7', // Amarelo suave
  '#DCFCE7', // Verde pastel
  '#DBEAFE', // Azul pastel
  '#F3E8FF', // Roxo pastel
  '#FCE7F3', // Rosa pastel
  '#FFEDD5', // Laranja suave
  '#FEE2E2', // Coral suave
  '#CFFAFE', // Ciano suave
  '#F1F5F9'  // Cinza ardósia suave
];

// Cálculo dos 4 pontos de ancoragem (Topo, Direita, Fundo, Esquerda)
export function getPortPosition(node, portIndex) {
  const w = node.width || 160;
  const h = node.height || 60;
  switch (portIndex) {
    case 0: return { x: node.x + w / 2, y: node.y };          // Topo
    case 1: return { x: node.x + w, y: node.y + h / 2 };      // Direita
    case 2: return { x: node.x + w / 2, y: node.y + h };      // Fundo
    case 3: return { x: node.x, y: node.y + h / 2 };          // Esquerda
    default: return { x: node.x + w / 2, y: node.y + h / 2 };
  }
}

// Cálculo do caminho da curva suave de Bézier
export function getBezierPath(p1, p2) {
  const dx = Math.abs(p2.x - p1.x) * 0.5;
  const dy = Math.abs(p2.y - p1.y) * 0.5;
  const cx1 = p1.x + (p2.x > p1.x ? dx : -dx);
  const cy1 = p1.y;
  const cx2 = p2.x + (p2.x > p1.x ? -dx : dx);
  const cy2 = p2.y;
  return `M ${p1.x} ${p1.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p2.x} ${p2.y}`;
}
