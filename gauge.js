// gauge.js — modular confidence gauge (aligned with style.css)
// - Thin strokes via --gauge-stroke-width
// - No endpoint dot
// - Uses --gauge-color from result card
// - Provides createGauge + animateGauge named exports

const SVG_NS = 'http://www.w3.org/2000/svg';
const ARC_LENGTH = Math.PI * 80; // semicircle length for r=80 ≈ 251.327

export function createGauge(container, percentage = 0, _status = 'safe') {
  // Build SVG shell
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'gauge');
  svg.setAttribute('viewBox', '0 0 200 120');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Confidence gauge');

  // Optional outer ring (kept minimal; comment out if not used)
  // const ring = document.createElementNS(SVG_NS, 'path');
  // ring.setAttribute('class', 'gauge-ring');
  // ring.setAttribute('d', 'M20 100 A80 80 0 0 1 180 100');

  // Track (background arc)
  const track = document.createElementNS(SVG_NS, 'path');
  track.setAttribute('class', 'gauge-track');
  track.setAttribute('d', 'M20 100 A80 80 0 0 1 180 100');

  // Value arc (foreground, animated)
  const value = document.createElementNS(SVG_NS, 'path');
  value.setAttribute('class', 'gauge-value');
  value.setAttribute('d', 'M20 100 A80 80 0 0 1 180 100');
  value.setAttribute('fill', 'none');
  value.setAttribute('stroke-dasharray', ARC_LENGTH.toString());
  value.setAttribute('stroke-dashoffset', ARC_LENGTH.toString());

  // Needle (slim, centered rotation)
  const needle = document.createElementNS(SVG_NS, 'line');
  needle.setAttribute('class', 'gauge-needle');
  // Pivot at center (100,100); point towards arc
  needle.setAttribute('x1', '100');
  needle.setAttribute('y1', '100');
  needle.setAttribute('x2', '100');
  needle.setAttribute('y2', '28'); // length ~72px upwards
  // Transform origin is set via CSS (100 100)

  // Center circle
  const center = document.createElementNS(SVG_NS, 'circle');
  center.setAttribute('class', 'gauge-center');
  center.setAttribute('cx', '100');
  center.setAttribute('cy', '100');
  center.setAttribute('r', '10');

  svg.append(track, value, needle, center);
  container.appendChild(svg);

  // Initial static state (no animation yet)
  setGaugePercentage(svg, percentage, { immediate: true });
}

export function animateGauge(root, confidence, color, options = {}) {
  const duration = Math.max(200, options.duration ?? 1100);
  const reduceMotion = options.reduceMotion ?? false;

  // Allow CSS to pick color via --gauge-color set on parent card
  if (color) {
    root.style.setProperty('--gauge-color', color);
  }

  const svg = root.querySelector('.gauge');
  const value = svg?.querySelector('.gauge-value');
  const needle = svg?.querySelector('.gauge-needle');
  const label = root.querySelector('.confidence-label');

  if (!svg || !value || !needle) return;

  // Add animating class for subtle shadow bump
  svg.classList.add('animating');

  // Animate arc and needle
  setGaugePercentage(svg, confidence, { duration, reduceMotion });

  // Animate numeric label if present
  if (label && !reduceMotion) {
    animateLabel(label, confidence, duration);
  }

  // Mark complete after animation
  window.setTimeout(() => {
    svg.classList.remove('animating');
    svg.classList.add('complete');
    if (label) label.classList.add('complete');
  }, duration + 50);
}

/* Helpers */

function setGaugePercentage(svg, percentage, { duration = 800, reduceMotion = false, immediate = false } = {}) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const value = svg.querySelector('.gauge-value');
  const needle = svg.querySelector('.gauge-needle');
  if (!value || !needle) return;

  const offset = ARC_LENGTH - (ARC_LENGTH * clamped) / 100;
  if (immediate || reduceMotion) {
    value.style.transition = 'none';
    needle.style.transition = 'none';
  } else {
    value.style.transition = `stroke-dashoffset ${duration}ms cubic-bezier(0.6, 0, 0.4, 1)`;
    needle.style.transition = `transform ${duration}ms cubic-bezier(0.6, 0, 0.4, 1)`;
  }
  value.setAttribute('stroke-dashoffset', String(offset));

  // Map 0–100% to needle angle over the semicircle (-180° to 0° relative to upward)
  // We rotate around center (100,100); initial points upward, so rotate negative towards left.
  const angleDeg = -180 + (clamped / 100) * 180; // -180° (left) to 0° (up)
  needle.style.transform = `rotate(${angleDeg}deg)`;
}

function animateLabel(labelEl, target, duration) {
  const start = performance.now();
  const from = 0;
  const to = Math.round(target);
  const ease = (t) => 1 - Math.pow(1 - t, 4); // easeOutQuart

  function step(now) {
    const t = Math.min(1, (now - start) / duration);
    const val = Math.round(from + (to - from) * ease(t));
    labelEl.textContent = `Confidence: ${val}%`;
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
