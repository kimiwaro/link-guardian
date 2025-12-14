/* script.js — Link Guardian v2.0
   Smart refinements: 
   - Consolidated SVG gauge factory
   - Cached metrics to prevent redundant calculations
   - Event delegation for button handlers
   - Heuristics logic separated from rendering
   - Enhanced error handling and edge cases
   - Performance optimizations (debounce, memoization)
   - Accessibility-first approach
   - Data-driven styling
*/

const DEBUG = new URLSearchParams(location.search).has('debug');

// ============================================
// STATE MANAGEMENT
// ============================================
const STATE = {
  submitLocked: false,
  currentController: null,
  currentRaf: null,
  gaugeMetrics: null, // Cache for arc length
};

const CONFIG = {
  SUBMIT_LOCK_MS: 600,
  DELAY_MS: 900,
  GAUGE_ANIMATION_DURATION: 1100,
};

const SHORTENERS = ['bit.ly', 't.co', 'tinyurl.com', 'ow.ly', 'is.gd', 'buff.ly', 'goo.gl'];
const SUSPICIOUS_TLDS = ['. xyz', '.top', '.gq', '.tk', '.cf'];

const VERDICT_CONFIG = {
  safe: {
    class: 'safe',
    emoji: '✅',
    text: 'Likely Genuine',
    color: '#28a745',
    bgColor: '#d4edda',
    borderColor: '#c3e6cb',
    textColor: '#155724',
  },
  fake: {
    class: 'fake',
    emoji: '⚠️',
    text:  'Likely Fake',
    color: '#dc3545',
    bgColor:  '#f8d7da',
    borderColor: '#f5c6cb',
    textColor: '#721c24',
  },
  unknown: {
    class: 'unknown',
    emoji: '❓',
    text: 'Invalid URL',
    color: '#ffc107',
    bgColor:  '#fff8e1',
    borderColor:  '#ffe08a',
    textColor: '#5c4400',
  },
};

/* Easing functions */
const EASING = {
  linear: (t) => t,
  easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeOutQuart: (t) => 1 - Math.pow(1 - t, 4),
  easeOutElastic: (t) => {
    if (t === 0 || t === 1) return t;
    const p = 0.3;
    const s = p / (2 * Math.PI);
    return Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + 1;
  },
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
  wireFormListeners();
  wireButtonListeners();
  debugLog('App initialized');
}

function wireFormListeners() {
  const form = document.getElementById('checkForm');
  const input = document.getElementById('urlInput');

  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    checkLink();
  });

  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') input.value = '';
    });

    // Focus on input on page load for better UX
    input.focus();
  }
}

function wireButtonListeners() {
  const actionsContainer = document.querySelector('.actions');
  if (!actionsContainer) return;

  actionsContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.id === 'copyBtn') copyResult();
    if (btn.id === 'shareBtn') shareToWhatsApp();
    if (btn.id === 'nativeShareBtn') shareNative();
  });
}

// ============================================
// MAIN LOGIC
// ============================================
function checkLink() {
  // Debounce multiple rapid clicks
  if (STATE.submitLocked) return;
  STATE.submitLocked = true;
  setTimeout(() => {
    STATE.submitLocked = false;
  }, CONFIG.SUBMIT_LOCK_MS);

  // Abort previous operation
  abortCurrentOperation();

  STATE.currentController = new AbortController();
  const { signal } = STATE.currentController;

  const urlInput = document.getElementById('urlInput');
  const url = (urlInput?. value || '').trim();
  const resultDiv = document.getElementById('result');

  if (!resultDiv || !url) return;

  // Show loading state
  showLoadingState(resultDiv);
  hideActionButtons();

  // Debounced check with cancellation support
  const delayId = setTimeout(() => {
    if (signal.aborted) return;

    try {
      const parsedUrl = new URL(url);
      const verdict = analyzeUrl(parsedUrl);
      renderResult(resultDiv, verdict);
      animateGaugeForVerdict(resultDiv, verdict);
      showActionButtons();

      // Store summary for share/copy actions
      storeResultSummary(resultDiv, parsedUrl, verdict);
    } catch (error) {
      const verdict = {
        verdictClass: 'unknown',
        verdictEmoji: '❓',
        verdictText: 'Invalid URL format.',
        reason: 'Please enter a valid link (e.g.  https://example.com).',
        confidence: 0,
        color:  VERDICT_CONFIG.unknown.color,
      };
      renderResult(resultDiv, verdict, true); // true = simple result
    }
  }, CONFIG.DELAY_MS);

  // Allow cancellation
  signal.addEventListener('abort', () => {
    clearTimeout(delayId);
    resultDiv.classList.remove('loading');
  });
}

function analyzeUrl(parsedUrl) {
  const hrefLower = parsedUrl.href.toLowerCase();
  const host = parsedUrl.hostname.toLowerCase();

  // Detect issues
  const issues = detectUrlIssues(host, hrefLower, parsedUrl.protocol);

  // Calculate confidence score
  let confidence = 85;
  const flags = [];

  issues.forEach(({ type, score, message }) => {
    confidence -= score;
    flags.push(message);
  });

  confidence = Math.max(0, Math.min(100, confidence));

  // Determine verdict
  let verdictType = 'safe';
  if (flags.length > 0 || confidence < 60) {
    verdictType = 'fake';
  }

  const verdictConfig = VERDICT_CONFIG[verdictType];

  return {
    verdictClass: verdictConfig.class,
    verdictEmoji: verdictConfig.emoji,
    verdictText: verdictConfig.text,
    reason: flags.length ?  flags.join('; ') : 'No obvious suspicious patterns.',
    confidence,
    color: verdictConfig. color,
    url: parsedUrl.href,
    ... verdictConfig,
  };
}

function detectUrlIssues(host, hrefLower, protocol) {
  const issues = [];

  // Check for punycode (IDN homograph attacks)
  if (host.includes('xn--')) {
    issues.push({ type: 'punycode', score: 35, message: 'Punycode (possible homograph)' });
  }

  // Check for URL shorteners
  if (SHORTENERS.some(s => host === s || host.endsWith('.' + s))) {
    issues.push({ type: 'shortener', score: 30, message: 'URL shortener' });
  }

  // Check for suspicious TLDs
  if (SUSPICIOUS_TLDS.some(t => host.endsWith(t))) {
    issues.push({ type: 'suspiciousTld', score: 25, message:  'Uncommon TLD' });
  }

  // Check for login/secure keywords
  if (hrefLower.includes('login') || hrefLower.includes('signin') || hrefLower.includes('secure')) {
    issues.push({ type: 'loginKeyword', score: 20, message: 'Login/secure keyword' });
  }

  // Check for unusual protocols
  if (protocol !== 'http: ' && protocol !== 'https:') {
    issues.push({ type: 'protocol', score:  40, message: 'Unusual protocol' });
  }

  return issues;
}

// ============================================
// RENDERING
// ============================================
function renderResult(resultDiv, verdict, isSimple = false) {
  resultDiv.innerHTML = '';
  resultDiv.className = 'result-card';
  resultDiv.classList.add(verdict.verdictClass);
  resultDiv.dataset.verdict = verdict.verdictClass;
  resultDiv.dataset.confidence = verdict.confidence;

  // Update CSS custom property for color
  resultDiv.style.setProperty('--gauge-color', verdict.color);

  const elements = [];

  // Header
  const header = createElement('div', {
    className: 'verdict-header fade-step',
    'data-delay': '1',
    innerHTML: `${verdict.verdictEmoji} ${verdict.verdictText}`,
    role: 'heading',
    'aria-level': '2',
  });
  elements.push(header);

  // Reason
  const reasonEl = createElement('div', {
    className: 'verdict-reason fade-step',
    'data-delay': '2',
    textContent: `Reason: ${verdict.reason}`,
  });
  elements.push(reasonEl);

  // Confidence label
  const confEl = createElement('div', {
    className: 'confidence-label fade-step',
    'data-delay': '3',
    textContent: `Confidence: ${verdict.confidence}%`,
    'aria-live': 'polite',
    role: 'status',
  });
  elements.push(confEl);

  // Gauge (skip for simple/invalid results)
  if (!isSimple) {
    const gauge = createGaugeSVG(verdict.confidence, verdict.color);
    gauge.classList.add('fade-step');
    gauge.setAttribute('data-delay', '4');
    elements.push(gauge);
  }

  // Append all elements
  elements.forEach(el => resultDiv. appendChild(el));

  // Trigger staggered animation
  requestAnimationFrame(() => {
    resultDiv.classList.add('show');
    resultDiv.querySelectorAll('.fade-step').forEach(el => {
      const delay = parseInt(el.getAttribute('data-delay') || '0');
      setTimeout(() => el.classList.add('show'), delay * 80);
    });
  });
}

function createGaugeSVG(confidence, color) {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const svg = document. createElementNS(SVG_NS, 'svg');

  svg.setAttribute('class', 'gauge');
  svg.setAttribute('viewBox', '0 0 200 110');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Confidence gauge: ${confidence}%`);

  // Background arc
  const bgPath = createSVGElement(SVG_NS, 'path', {
    class: 'gauge-bg',
    d: 'M10 100 A90 90 0 0 1 190 100',
    fill: 'none',
    stroke: '#eee',
    'stroke-width': '20',
  });

  // Tick marks
  const tickGroup = createTickMarks(SVG_NS);
  tickGroup.forEach(el => svg.appendChild(el));

  // Confidence ring
  const ring = createSVGElement(SVG_NS, 'circle', {
    class: 'gauge-ring',
    cx: '100',
    cy: '100',
    r: '60',
    fill: 'none',
    stroke: '#f5f5f5',
    'stroke-width': '1',
    opacity: '0.6',
  });

  // Fill arc
  const fillPath = createSVGElement(SVG_NS, 'path', {
    class: 'gauge-fill',
    d: 'M10 100 A90 90 0 0 1 190 100',
    fill: 'none',
    'stroke-width': '20',
    'stroke-dasharray': '0 283',
    'stroke-linecap': 'round',
  });

  // Needle
  const needle = createSVGElement(SVG_NS, 'line', {
    class: 'needle',
    x1: '100',
    y1: '100',
    x2: '100',
    y2: '20',
    stroke: '#5a4a42',
    'stroke-width':  '4',
    'stroke-linecap': 'round',
    transform: 'rotate(-90,100,100)',
  });

  // Pivot center
  const pivot = createSVGElement(SVG_NS, 'circle', {
    class: 'gauge-pivot',
    cx: '100',
    cy: '100',
    r: '8',
    fill: '#333',
  });

  // Arc endpoint
  const endCircle = createSVGElement(SVG_NS, 'circle', {
    class: 'arc-end',
    r: '5',
    fill: 'transparent',
  });

  // Assemble
  [bgPath, ring, fillPath, needle, pivot, endCircle]. forEach(el => svg.appendChild(el));

  return svg;
}

function createTickMarks(SVG_NS) {
  const ticks = [];
  const tickPoints = [
    { pos: 0, label: '0%', major: true },
    { pos: 25, label: '25%', major: false },
    { pos:  50, label: '50%', major: true },
    { pos: 75, label: '75%', major: false },
    { pos:  100, label: '100%', major: true },
  ];

  tickPoints.forEach(point => {
    const angle = -90 + (point.pos / 100) * 180;
    const rad = (angle * Math.PI) / 180;
    const tickLength = point.major ? 12 : 8;
    const innerRadius = 78;
    const outerRadius = innerRadius + tickLength;

    const x1 = 100 + innerRadius * Math.cos(rad);
    const y1 = 100 + innerRadius * Math.sin(rad);
    const x2 = 100 + outerRadius * Math.cos(rad);
    const y2 = 100 + outerRadius * Math.sin(rad);

    const tick = createSVGElement(SVG_NS, 'line', {
      x1,
      y1,
      x2,
      y2,
      class: `gauge-tick ${point.major ? 'major' : ''}`,
      stroke: point.major ? '#ccc' : '#ddd',
      'stroke-width': point.major ? '1. 5' : '1',
    });
    ticks.push(tick);

    if (point.major) {
      const labelX = 100 + (innerRadius - 18) * Math.cos(rad);
      const labelY = 100 + (innerRadius - 18) * Math.sin(rad);

      const label = createSVGElement(SVG_NS, 'text', {
        x:  labelX,
        y: labelY,
        class: 'gauge-tick-label',
        'text-anchor': 'middle',
        'font-size': '10',
        fill: '#999',
      });
      label.textContent = point.label;
      ticks.push(label);
    }
  });

  return ticks;
}

function animateGaugeForVerdict(resultDiv, verdict) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  animateGauge(resultDiv, verdict. confidence, verdict.color, {
    duration: CONFIG.GAUGE_ANIMATION_DURATION,
    reduceMotion,
    enableWobble: !reduceMotion,
    debug: DEBUG,
  });
}

function animateGauge(root, confidence, color, options = {}) {
  const { duration = 1200, reduceMotion = false, enableWobble = true } = options;
  const fill = root.querySelector('.gauge-fill');
  const needle = root.querySelector('.needle');
  const label = root.querySelector('.confidence-label');
  const pathEl = root.querySelector('.gauge-bg');
  const endCircle = root.querySelector('.arc-end');
  const gauge = root.querySelector('.gauge');

  if (!fill || !needle || !label || !pathEl || !endCircle || ! gauge) return;

  // Cache arc length
  if (!STATE.gaugeMetrics) {
    try {
      STATE.gaugeMetrics = pathEl.getTotalLength();
    } catch {
      STATE.gaugeMetrics = 283;
    }
  }

  const maxArc = STATE.gaugeMetrics;
  const safeConfidence = Math.max(0, Math.min(100, Number(confidence) || 0));
  const arc = (safeConfidence / 100) * maxArc;
  const targetAngle = -90 + (safeConfidence / 100) * 180;

  fill.setAttribute('stroke', color);
  endCircle.setAttribute('fill', color);

  if (reduceMotion) {
    fill.setAttribute('stroke-dasharray', `${arc} ${maxArc - arc}`);
    const pt = pathEl.getPointAtLength(arc);
    endCircle.setAttribute('cx', pt.x);
    endCircle.setAttribute('cy', pt.y);
    needle.setAttribute('transform', `rotate(${targetAngle},100,100)`);
    label.textContent = `Confidence: ${safeConfidence}%`;
    gauge.classList.add('complete');
    return;
  }

  // Cancel previous animation
  if (STATE.currentRaf) {
    cancelAnimationFrame(STATE.currentRaf);
  }

  gauge.classList.add('active');
  let start = null;

  function frame(now) {
    if (!start) start = now;
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = EASING.easeOutCubic(progress);

    const currentArc = arc * eased;
    fill.setAttribute('stroke-dasharray', `${currentArc} ${maxArc - currentArc}`);

    const pt = pathEl.getPointAtLength(currentArc);
    endCircle.setAttribute('cx', pt.x);
    endCircle.setAttribute('cy', pt.y);

    const angle = -90 + (-90 - targetAngle) * (1 - eased);
    needle.setAttribute('transform', `rotate(${angle},100,100)`);

    const currentValue = Math.round(safeConfidence * eased);
    label.textContent = `Confidence: ${currentValue}%`;

    if (progress < 1) {
      STATE.currentRaf = requestAnimationFrame(frame);
    } else {
      needle.setAttribute('transform', `rotate(${targetAngle},100,100)`);
      label.textContent = `Confidence: ${safeConfidence}%`;
      gauge.classList.remove('active');
      gauge.classList.add('complete');
      label.classList.add('complete');

      if (enableWobble) {
        animateNeedleWobble(needle, targetAngle, 2);
      }
    }
  }

  STATE.currentRaf = requestAnimationFrame(frame);
}

function animateNeedleWobble(needle, baseAngle, wobbles) {
  let wobbleCount = 0;
  const wobbleAmount = 8;
  const wobbleDuration = 150;

  function wobble(direction) {
    const targetAngle = baseAngle + direction * wobbleAmount;
    needle.style.transition = `transform ${wobbleDuration}ms ease-out`;
    needle.setAttribute('transform', `rotate(${targetAngle},100,100)`);

    wobbleCount++;
    if (wobbleCount < wobbles * 2) {
      setTimeout(() => wobble(-direction), wobbleDuration);
    } else {
      needle.style.transition = 'none';
      needle.setAttribute('transform', `rotate(${baseAngle},100,100)`);
    }
  }

  wobble(1);
}

function storeResultSummary(resultDiv, parsedUrl, verdict) {
  const summary = `Checked: ${parsedUrl. href}
${verdict.verdictEmoji} ${verdict.verdictText}
Reason: ${verdict.reason}
Confidence: ${verdict.confidence}%`;
  resultDiv.dataset.summary = summary;
}

// ============================================
// UI STATE HELPERS
// ============================================
function showLoadingState(resultDiv) {
  resultDiv.innerHTML = '';
  resultDiv.className = 'result-card loading';
  resultDiv.setAttribute('aria-busy', 'true');
}

function hideActionButtons() {
  document.getElementById('copyBtn').style.display = 'none';
  document. getElementById('shareBtn').style.display = 'none';
  document.getElementById('nativeShareBtn').style.display = 'none';
}

function showActionButtons() {
  const resultDiv = document.getElementById('result');
  document.getElementById('copyBtn').style.display = 'inline-block';
  document.getElementById('shareBtn').style.display = 'inline-block';

  if (navigator.share && document.getElementById('nativeShareBtn')) {
    document.getElementById('nativeShareBtn').style.display = 'inline-block';
  }

  resultDiv.removeAttribute('aria-busy');
}

function abortCurrentOperation() {
  if (STATE.currentController) {
    try {
      STATE.currentController. abort();
    } catch {}
    STATE.currentController = null;
  }
  if (STATE.currentRaf) {
    cancelAnimationFrame(STATE.currentRaf);
    STATE.currentRaf = null;
  }
}

// ============================================
// SHARE & COPY ACTIONS
// ============================================
function copyResult() {
  const resultDiv = document.getElementById('result');
  const summary = resultDiv?. dataset?. summary || resultDiv?. innerText || 'No result available. ';

  if (! navigator.clipboard) {
    alert('Clipboard not supported.  Select and copy manually.');
    return;
  }

  navigator.clipboard
    .writeText(summary)
    .then(() => {
      showToast('Result copied!  Paste it anywhere.');
    })
    .catch(() => {
      alert('Copy failed. Select and copy manually.');
    });
}

function shareToWhatsApp() {
  const resultDiv = document.getElementById('result');
  const summary = resultDiv?.dataset?. summary || resultDiv?.innerText || '';

  if (!summary) {
    alert('No result to share.');
    return;
  }

  const whatsappUrl = `https://wa.me/? text=${encodeURIComponent(summary)}`;
  window.open(whatsappUrl, '_blank');
}

function shareNative() {
  const resultDiv = document.getElementById('result');
  const summary = resultDiv?.dataset?.summary || resultDiv?.innerText || '';

  if (!summary) {
    alert('No result to share.');
    return;
  }

  if (navigator.share) {
    navigator.share({
      title: 'Link Guardian Result',
      text: summary,
    }).catch(err => {
      if (err.name !== 'AbortError') {
        debugLog('Share error:', err);
      }
    });
  } else {
    navigator.clipboard
      .writeText(summary)
      .then(() => {
        showToast('Sharing not supported. Result copied instead! ');
      })
      .catch(() => {
        alert('Unable to share or copy automatically.');
      });
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function createElement(tag, attrs = {}) {
  const el = document. createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'innerHTML') {
      el.innerHTML = value;
    } else if (key === 'textContent') {
      el.textContent = value;
    } else if (key === 'className') {
      el.className = value;
    } else {
      el.setAttribute(key, value);
    }
  });
  return el;
}

function createSVGElement(ns, tag, attrs = {}) {
  const el = document.createElementNS(ns, tag);
  Object.entries(attrs).forEach(([key, value]) => {
    el.setAttribute(key, value);
  });
  return el;
}

function showToast(message) {
  // Simple toast implementation (optional enhancement)
  console.log(message);
  // Could implement a toast UI here
}

function debugLog(... args) {
  if (DEBUG) {
    console.log('[Link Guardian]', ...args);
  }
}
