/* script.js — Link Guardian v3.0 — Redesigned Gauge
   - Clean, modern gauge design with proper proportions
   - Thin, elegant strokes (8px, not 20px)
   - Unified center circle for visual harmony
   - No disconnected end-dots or blobs
   - Slim needle, centered rotation
   - Smooth animations with cubic-bezier easing
*/

const DEBUG = new URLSearchParams(location.search).has('debug');

// ============================================
// STATE & CONFIG
// ============================================
const STATE = {
  submitLocked: false,
  currentController: null,
  currentRaf: null,
  gaugeArcLength: null,
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
  },
  fake: {
    class: 'fake',
    emoji: '⚠️',
    text:  'Likely Fake',
    color: '#dc3545',
  },
  unknown: {
    class: 'unknown',
    emoji: '❓',
    text: 'Invalid URL',
    color: '#ffc107',
  },
};

const EASING = {
  linear: (t) => t,
  easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeOutQuart: (t) => 1 - Math.pow(1 - t, 4),
};

// ============================================
// INITIALIZATION
// ============================================
document. addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('checkForm');
  const input = document. getElementById('urlInput');
  const actionsContainer = document.querySelector('.actions');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      checkLink();
    });
  }

  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') input.value = '';
    });
    input.focus();
  }

  if (actionsContainer) {
    actionsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      if (btn.id === 'copyBtn') copyResult();
      if (btn.id === 'shareBtn') shareToWhatsApp();
      if (btn.id === 'nativeShareBtn') shareNative();
    });
  }
});

// ============================================
// MAIN LOGIC
// ============================================
function checkLink() {
  if (STATE.submitLocked) return;
  STATE.submitLocked = true;
  setTimeout(() => {
    STATE.submitLocked = false;
  }, CONFIG.SUBMIT_LOCK_MS);

  // Abort previous
  abortCurrentOperation();

  STATE.currentController = new AbortController();
  const { signal } = STATE.currentController;

  const urlInput = document.getElementById('urlInput');
  const url = (urlInput?. value || '').trim();
  const resultDiv = document.getElementById('result');

  if (!resultDiv || !url) return;

  showLoadingState(resultDiv);
  hideActionButtons();

  const delayId = setTimeout(() => {
    if (signal.aborted) return;

    try {
      const parsedUrl = new URL(url);
      const verdict = analyzeUrl(parsedUrl);
      renderResultCard(resultDiv, verdict);
      animateGaugeForVerdict(resultDiv, verdict);
      showActionButtons();
      storeResultSummary(resultDiv, parsedUrl, verdict);
    } catch {
      const verdict = {
        verdictClass: 'unknown',
        verdictEmoji: '❓',
        verdictText: 'Invalid URL format.',
        reason: 'Please enter a valid link (e.g.  https://example.com).',
        confidence: 0,
        color:  VERDICT_CONFIG.unknown.color,
      };
      renderResultCard(resultDiv, verdict, true);
    }
  }, CONFIG.DELAY_MS);

  signal.addEventListener('abort', () => {
    clearTimeout(delayId);
    resultDiv.classList.remove('loading');
  });
}

function analyzeUrl(parsedUrl) {
  const hrefLower = parsedUrl.href.toLowerCase();
  const host = parsedUrl.hostname.toLowerCase();

  const issues = [];

  // Punycode check
  if (host.includes('xn--')) {
    issues.push({ score: 35, message: 'Punycode (possible homograph)' });
  }

  // Shortener check
  if (SHORTENERS.some(s => host === s || host.endsWith('.' + s))) {
    issues.push({ score: 30, message: 'URL shortener' });
  }

  // Suspicious TLD
  if (SUSPICIOUS_TLDS.some(t => host.endsWith(t))) {
    issues.push({ score: 25, message: 'Uncommon TLD' });
  }

  // Login keywords
  if (hrefLower.includes('login') || hrefLower.includes('signin') || hrefLower.includes('secure')) {
    issues.push({ score: 20, message: 'Login/secure keyword' });
  }

  // Unusual protocol
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    issues.push({ score: 40, message: 'Unusual protocol' });
  }

  let confidence = 85;
  const flags = issues.map(i => i.message);
  issues.forEach(i => (confidence -= i.score));
  confidence = Math.max(0, Math.min(100, confidence));

  const verdictType = flags.length > 0 || confidence < 60 ? 'fake' : 'safe';
  const verdictConfig = VERDICT_CONFIG[verdictType];

  return {
    verdictClass: verdictConfig. class,
    verdictEmoji: verdictConfig.emoji,
    verdictText: verdictConfig.text,
    reason: flags.length ?  flags.join('; ') : 'No obvious suspicious patterns.',
    confidence,
    color: verdictConfig. color,
    url: parsedUrl.href,
  };
}

// ============================================
// RENDERING
// ============================================
function renderResultCard(resultDiv, verdict, isSimple = false) {
  resultDiv.innerHTML = '';
  resultDiv.className = 'result-card';
  resultDiv.classList.add(verdict.verdictClass);
  resultDiv.dataset.verdict = verdict.verdictClass;
  resultDiv.dataset.confidence = verdict.confidence;
  resultDiv.style.setProperty('--gauge-color', verdict.color);

  const elements = [];

  // Header
  const header = document.createElement('div');
  header.className = 'verdict-header fade-step';
  header.setAttribute('data-delay', '1');
  header.setAttribute('role', 'heading');
  header.setAttribute('aria-level', '2');
  header.innerHTML = `${verdict.verdictEmoji} ${verdict.verdictText}`;
  elements.push(header);

  // Reason
  const reasonEl = document.createElement('div');
  reasonEl.className = 'verdict-reason fade-step';
  reasonEl.setAttribute('data-delay', '2');
  reasonEl.textContent = `Reason: ${verdict.reason}`;
  elements.push(reasonEl);

  // Confidence label
  const confEl = document.createElement('div');
  confEl.className = 'confidence-label fade-step';
  confEl.setAttribute('data-delay', '3');
  confEl.setAttribute('aria-live', 'polite');
  confEl.setAttribute('role', 'status');
  confEl.textContent = `Confidence: ${verdict.confidence}%`;
  elements.push(confEl);

  // Gauge (skip for invalid/simple)
  if (!isSimple) {
    const gauge = createModernGaugeSVG(verdict.confidence, verdict.color);
    gauge.classList.add('fade-step');
    gauge.setAttribute('data-delay', '4');
    elements.push(gauge);
  }

  elements.forEach(el => resultDiv.appendChild(el));

  // Staggered animation
  requestAnimationFrame(() => {
    resultDiv.classList.add('show');
    resultDiv.querySelectorAll('.fade-step').forEach(el => {
      const delay = parseInt(el.getAttribute('data-delay') || '0');
      setTimeout(() => el.classList.add('show'), delay * 80);
    });
  });
}

function createModernGaugeSVG(confidence, color) {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(SVG_NS, 'svg');

  svg.setAttribute('class', 'gauge');
  svg.setAttribute('viewBox', '0 0 200 120');
  svg.setAttribute('width', '220');
  svg.setAttribute('height', '120');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Confidence gauge:  ${confidence}%`);

  // Background track (thin, subtle)
  const track = document.createElementNS(SVG_NS, 'path');
  track.setAttribute('class', 'gauge-track');
  track.setAttribute('d', 'M30,100 A70,70 0 0 1 170,100');
  track.setAttribute('fill', 'none');
  track.setAttribute('stroke', '#eaeaea');
  track.setAttribute('stroke-width', '8');
  track.setAttribute('stroke-linecap', 'round');
  svg.appendChild(track);

  // Value arc (dynamic, animated)
  const arc = document. createElementNS(SVG_NS, 'path');
  arc.setAttribute('class', 'gauge-value');
  arc.setAttribute('d', 'M30,100 A70,70 0 0 1 170,100');
  arc.setAttribute('fill', 'none');
  arc.setAttribute('stroke', color);
  arc.setAttribute('stroke-width', '8');
  arc.setAttribute('stroke-linecap', 'round');
  arc.setAttribute('stroke-dasharray', '0 283');
  svg.appendChild(arc);

  // Needle (slim, centered)
  const needle = document.createElementNS(SVG_NS, 'line');
  needle.setAttribute('class', 'gauge-needle');
  needle.setAttribute('x1', '100');
  needle.setAttribute('y1', '100');
  needle.setAttribute('x2', '100');
  needle.setAttribute('y2', '36');
  needle.setAttribute('stroke', '#333');
  needle.setAttribute('stroke-width', '3');
  needle.setAttribute('stroke-linecap', 'round');
  needle.setAttribute('transform', 'rotate(-105,100,100)');
  svg.appendChild(needle);

  // Center circle (unifies the design, hides line joins)
  const center = document.createElementNS(SVG_NS, 'circle');
  center.setAttribute('class', 'gauge-center');
  center.setAttribute('cx', '100');
  center.setAttribute('cy', '100');
  center.setAttribute('r', '7');
  center.setAttribute('fill', '#fff');
  center.setAttribute('stroke', '#e0e0e0');
  center.setAttribute('stroke-width', '2');
  svg.appendChild(center);

  return svg;
}

function animateGaugeForVerdict(resultDiv, verdict) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  animateGauge(resultDiv, verdict. confidence, verdict.color, {
    duration: CONFIG.GAUGE_ANIMATION_DURATION,
    reduceMotion,
    enableWobble: !reduceMotion,
  });
}

function animateGauge(root, confidence, color, options = {}) {
  const { duration = 1200, reduceMotion = false, enableWobble = true } = options;
  const arc = root.querySelector('.gauge-value');
  const needle = root. querySelector('.gauge-needle');
  const label = root.querySelector('.confidence-label');
  const track = root.querySelector('.gauge-track');
  const gauge = root.querySelector('.gauge');

  if (!arc || !needle || !label || !track || !gauge) return;

  // Cache arc length
  if (!STATE.gaugeArcLength) {
    try {
      STATE.gaugeArcLength = track.getTotalLength();
    } catch {
      STATE.gaugeArcLength = 283;
    }
  }

  const totalLength = STATE.gaugeArcLength;
  const safeConfidence = Math.max(0, Math.min(100, Number(confidence) || 0));
  const progress = safeConfidence / 100;
  const arcLength = totalLength * progress;

  // Needle angle:  -105° (left) to 105° (right)
  const needleAngle = -105 + 210 * progress;

  arc.setAttribute('stroke', color);

  if (reduceMotion) {
    arc.setAttribute('stroke-dasharray', `${arcLength} ${totalLength - arcLength}`);
    needle.setAttribute('transform', `rotate(${needleAngle},100,100)`);
    label.textContent = `Confidence: ${safeConfidence}%`;
    gauge.classList.add('complete');
    return;
  }

  // Cancel previous
  if (STATE.currentRaf) {
    cancelAnimationFrame(STATE.currentRaf);
  }

  gauge.classList.add('animating');
  let start = null;

  function frame(now) {
    if (!start) start = now;
    const elapsed = now - start;
    const rawProgress = Math.min(elapsed / duration, 1);
    const eased = EASING. easeOutCubic(rawProgress);

    const currentArc = arcLength * eased;
    arc.setAttribute('stroke-dasharray', `${currentArc} ${totalLength - currentArc}`);

    const currentAngle = -105 + 210 * eased * progress;
    needle.setAttribute('transform', `rotate(${currentAngle},100,100)`);

    const currentValue = Math.round(safeConfidence * eased);
    label.textContent = `Confidence: ${currentValue}%`;

    if (rawProgress < 1) {
      STATE.currentRaf = requestAnimationFrame(frame);
    } else {
      needle.setAttribute('transform', `rotate(${needleAngle},100,100)`);
      label.textContent = `Confidence: ${safeConfidence}%`;
      gauge.classList.remove('animating');
      gauge.classList.add('complete');
      label.classList.add('complete');

      if (enableWobble) {
        animateNeedleWobble(needle, needleAngle, 2);
      }
    }
  }

  STATE.currentRaf = requestAnimationFrame(frame);
}

function animateNeedleWobble(needle, baseAngle, wobbles) {
  let wobbleCount = 0;
  const wobbleAmount = 6;
  const wobbleDuration = 140;

  function wobble(direction) {
    const targetAngle = baseAngle + direction * wobbleAmount;
    needle.style.transition = `transform ${wobbleDuration}ms cubic-bezier(0.6, 0, 0.4, 1)`;
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
  const summary = `Checked:  ${parsedUrl. href}
${verdict.verdictEmoji} ${verdict.verdictText}
Reason: ${verdict.reason}
Confidence: ${verdict.confidence}%`;
  resultDiv.dataset.summary = summary;
}

// ============================================
// UI STATE
// ============================================
function showLoadingState(resultDiv) {
  resultDiv.innerHTML = '';
  resultDiv.className = 'result-card loading';
  resultDiv.setAttribute('aria-busy', 'true');
}

function hideActionButtons() {
  document.getElementById('copyBtn').style.display = 'none';
  document.getElementById('shareBtn').style.display = 'none';
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
// SHARE & COPY
// ============================================
function copyResult() {
  const resultDiv = document.getElementById('result');
  const summary = resultDiv?. dataset?. summary || resultDiv?.innerText || 'No result available. ';

  if (! navigator.clipboard) {
    alert('Clipboard not supported.  Select and copy manually.');
    return;
  }

  navigator.clipboard
    .writeText(summary)
    .then(() => {
      alert('Result copied!  Paste it anywhere.');
    })
    .catch(() => {
      alert('Copy failed. Select and copy manually.');
    });
}

function shareToWhatsApp() {
  const resultDiv = document.getElementById('result');
  const summary = resultDiv?. dataset?.summary || resultDiv?.innerText || '';

  if (!summary) {
    alert('No result to share.');
    return;
  }

  const whatsappUrl = `https://wa.me/? text=${encodeURIComponent(summary)}`;
  window.open(whatsappUrl, '_blank');
}

function shareNative() {
  const resultDiv = document.getElementById('result');
  const summary = resultDiv?.dataset?. summary || resultDiv?.innerText || '';

  if (!summary) {
    alert('No result to share.');
    return;
  }

  if (navigator.share) {
    navigator.share({
      title: 'Link Guardian Result',
      text: summary,
    }).catch(err => {
      if (err. name !== 'AbortError') {
        console.log('Share error:', err);
      }
    });
  } else {
    navigator.clipboard
      .writeText(summary)
      .then(() => {
        alert('Sharing not supported.  Result copied instead! ');
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
