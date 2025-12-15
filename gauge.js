// gauge.js — standalone confidence meter

export function createGauge(container, percentage, status) {
  const arcLength = 251.2; // π × 80 for half circle
  const statusColors = {
    safe: 'var(--color-success)',
    warning: 'var(--color-warning)',
    danger: 'var(--color-danger)',
  };

  // Build SVG
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'gauge');
  svg.setAttribute('viewBox', '0 0 200 120');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Confidence gauge');

  // Background arc
  const bg = document.createElementNS(svgNS, 'path');
  bg.setAttribute('d', 'M20 100 A80 80 0 0 1 180 100');
  bg.setAttribute('stroke', 'var(--color-neutral-200)');
  bg.setAttribute('stroke-width', '12');
  bg.setAttribute('fill', 'none');
  bg.setAttribute('stroke-linecap', 'round');

  // Fill arc
  const fill = document.createElementNS(svgNS, 'path');
  fill.setAttribute('d', 'M20 100 A80 80 0 0 1 180 100');
  fill.setAttribute('stroke', statusColors[status]);
  fill.setAttribute('stroke-width', '12');
  fill.setAttribute('fill', 'none');
  fill.setAttribute('stroke-linecap', 'round');
  fill.setAttribute('stroke-dasharray', arcLength);
  fill.setAttribute('stroke-dashoffset', arcLength);

  // Endpoint marker
  const endCircle = document.createElementNS(svgNS, 'circle');
  endCircle.setAttribute('r', '6');
  endCircle.setAttribute('fill', statusColors[status]);
  endCircle.setAttribute('aria-hidden', 'true');

  // Percentage text
  const text = document.createElementNS(svgNS, 'text');
  text.setAttribute('x', '100');
  text.setAttribute('y', '95');
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('font-size', '28');
  text.setAttribute('font-weight', '700');
  text.setAttribute('fill', 'var(--color-neutral-900)');
  text.textContent = '0%';

  const caption = document.createElementNS(svgNS, 'text');
  caption.setAttribute('x', '100');
  caption.setAttribute('y', '112');
  caption.setAttribute('text-anchor', 'middle');
  caption.setAttribute('font-size', '12');
  caption.setAttribute('fill', 'var(--color-neutral-500)');
  caption.textContent = 'Confidence';

  svg.append(bg, fill, endCircle, text, caption);
  container.appendChild(svg);

  // Animate arc
  const offset = arcLength - (arcLength * percentage) / 100;
  fill.style.transition = 'stroke-dashoffset 800ms cubic-bezier(0.4,0,0.2,1)';
  fill.setAttribute('stroke-dashoffset', offset);

  // Animate endpoint
  const angle = (percentage / 100) * Math.PI;
  const cx = 100 + 80 * Math.cos(Math.PI - angle);
  const cy = 100 - 80 * Math.sin(Math.PI - angle);
  endCircle.style.transition = 'cx 800ms cubic-bezier(0.4,0,0.2,1), cy 800ms cubic-bezier(0.4,0,0.2,1)';
  endCircle.setAttribute('cx', cx);
  endCircle.setAttribute('cy', cy);

  // Animate number
  let current = 0;
  const increment = percentage / 80;
  const interval = setInterval(() => {
    current += increment;
    if (current >= percentage) {
      text.textContent = `${percentage}%`;
      clearInterval(interval);
    } else {
      text.textContent = `${Math.floor(current)}%`;
    }
  }, 10);
}
