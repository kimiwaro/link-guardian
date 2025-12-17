// gauge.js — modular confidence gauge (aligned with style.css)
// - Thin strokes via --gauge-stroke-width
// - Gradient value arc with rounded ends
// - Elegant needle design with triangular shape
// - Ticks at 10% intervals with labels at major points
// - Enhanced center with layered circles
// - Glow effect during animation
// - Accessibility improvements
// - Provides createGauge + animateGauge named exports

const SVG_NS = 'http://www.w3.org/2000/svg';
const ARC_LENGTH = Math.PI * 80; // semicircle length for r=80 ≈ 251.327

export function createGauge(container, percentage = 0, _status = 'safe') {
  // Build SVG shell
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'gauge');
  svg.setAttribute('viewBox', '0 0 200 120');
  svg.setAttribute('role', 'slider');
  svg.setAttribute('aria-label', `Confidence gauge showing ${percentage}%`);
  svg.setAttribute('aria-valuemin', '0');
  svg.setAttribute('aria-valuemax', '100');
  svg.setAttribute('aria-valuenow', percentage);
  svg.setAttribute('tabindex', '0');

  // Create definitions for gradient and filters
  const defs = document.createElementNS(SVG_NS, 'defs');
  
  // Gradient for value arc
  const gradientId = `gauge-gradient-${Math.random().toString(36).substr(2, 9)}`;
  const gradient = document.createElementNS(SVG_NS, 'linearGradient');
  gradient.setAttribute('id', gradientId);
  gradient.setAttribute('x1', '0%');
  gradient.setAttribute('y1', '0%');
  gradient.setAttribute('x2', '100%');
  gradient.setAttribute('y2', '0%');
  
  const stop1 = document.createElementNS(SVG_NS, 'stop');
  stop1.setAttribute('offset', '0%');
  stop1.setAttribute('stop-color', 'var(--gauge-color)');
  stop1.setAttribute('stop-opacity', '0.9');
  
  const stop2 = document.createElementNS(SVG_NS, 'stop');
  stop2.setAttribute('offset', '100%');
  stop2.setAttribute('stop-color', 'color-mix(in srgb, var(--gauge-color), white 40%)');
  
  gradient.append(stop1, stop2);
  defs.append(gradient);
  
  // Glow filter for animation
  const filterId = `glow-${Date.now()}`;
  const glowFilter = document.createElementNS(SVG_NS, 'filter');
  glowFilter.setAttribute('id', filterId);
  glowFilter.innerHTML = `
    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
    <feMerge>
      <feMergeNode in="coloredBlur"/>
      <feMergeNode in="SourceGraphic"/>
    </feMerge>
  `;
  defs.append(glowFilter);
  
  svg.append(defs);

  // Create ticks and labels
  createTicks(svg);

  // Track (background arc)
  const track = document.createElementNS(SVG_NS, 'path');
  track.setAttribute('class', 'gauge-track');
  track.setAttribute('d', 'M20 100 A80 80 0 0 1 180 100');

  // Value arc (foreground, animated)
  const value = document.createElementNS(SVG_NS, 'path');
  value.setAttribute('class', 'gauge-value');
  value.setAttribute('d', 'M20 100 A80 80 0 0 1 180 100');
  value.setAttribute('fill', 'none');
  value.setAttribute('stroke', `url(#${gradientId})`);
  value.setAttribute('stroke-dasharray', ARC_LENGTH.toString());
  value.setAttribute('stroke-dashoffset', ARC_LENGTH.toString());
  value.setAttribute('data-filter-id', filterId); // Store filter ID for animation

  // Needle (triangular shape for elegance)
  const needle = document.createElementNS(SVG_NS, 'path');
  needle.setAttribute('class', 'gauge-needle');
  needle.setAttribute('d', 'M100,100 L105,28 L100,22 L95,28 Z');
  needle.setAttribute('transform-origin', '100 100');

  // Center circle (layered for depth)
  const centerGroup = document.createElementNS(SVG_NS, 'g');
  centerGroup.setAttribute('class', 'gauge-center-group');
  
  const outerCircle = document.createElementNS(SVG_NS, 'circle');
  outerCircle.setAttribute('cx', '100');
  outerCircle.setAttribute('cy', '100');
  outerCircle.setAttribute('r', '12');
  
  const innerCircle = document.createElementNS(SVG_NS, 'circle');
  innerCircle.setAttribute('cx', '100');
  innerCircle.setAttribute('cy', '100');
  innerCircle.setAttribute('r', '6');
  
  centerGroup.append(outerCircle, innerCircle);

  // Append elements in correct z-order
  svg.append(track, value, needle, centerGroup);
  container.appendChild(svg);

  // Initial static state
  setGaugePercentage(svg, percentage, { immediate: true });
  
  return svg;
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

  // Update accessibility attributes
  svg.setAttribute('aria-valuenow', confidence);
  svg.setAttribute('aria-label', `Confidence gauge showing ${confidence}%`);

  // Add animating class for effects
  svg.classList.add('animating');
  
  // Apply glow filter during animation
  const filterId = value.getAttribute('data-filter-id');
  if (filterId && !reduceMotion) {
    value.setAttribute('filter', `url(#${filterId})`);
  }

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
    
    // Remove glow filter after animation
    value.removeAttribute('filter');
    
    if (label) label.classList.add('complete');
  }, duration + 50);
}

/* Helper Functions */

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
    needle.style.transition = `transform ${duration}ms cubic-bezier(0.34, 1.56, 0.64, 1)`; // Enhanced easing for needle
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

function createTicks(svg) {
  // Create tick marks at 10% intervals
  for (let i = 0; i <= 10; i++) {
    const angle = -180 + (i / 10) * 180;
    const rad = angle * Math.PI / 180;
    const isMajor = i % 2 === 0; // Every 20% gets a major tick
    const length = isMajor ? 8 : 5;
    
    // Create tick line
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('class', `gauge-tick ${isMajor ? 'major' : 'minor'}`);
    line.setAttribute('x1', 100 + 75 * Math.cos(rad));
    line.setAttribute('y1', 100 - 75 * Math.sin(rad));
    line.setAttribute('x2', 100 + (75 - length) * Math.cos(rad));
    line.setAttribute('y2', 100 - (75 - length) * Math.sin(rad));
    line.setAttribute('stroke', 'currentColor');
    line.setAttribute('stroke-opacity', '0.4');
    line.setAttribute('stroke-width', isMajor ? '1.5' : '1');
    
    // Add labels for major ticks (0, 20, 40, 60, 80, 100)
    if (isMajor) {
      const label = document.createElementNS(SVG_NS, 'text');
      label.setAttribute('class', 'gauge-label');
      label.setAttribute('x', 100 + (65 - length) * Math.cos(rad));
      label.setAttribute('y', 100 - (65 - length) * Math.sin(rad) + 3);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('font-size', '10');
      label.setAttribute('fill', 'currentColor');
      label.setAttribute('opacity', '0.6');
      label.textContent = `${i * 20}`;
      svg.append(label);
    }
    
    // Insert ticks before other elements
    if (svg.firstChild) {
      svg.insertBefore(line, svg.firstChild);
    } else {
      svg.append(line);
    }
  }
}
