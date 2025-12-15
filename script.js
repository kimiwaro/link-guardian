/* script.js — Link Guardian v3.0 — Redesigned Gauge
   - App logic and UI flow only
   - Gauge rendering/animation delegated to gauge.js
*/

import { createGauge, animateGauge } from './gauge.js';

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
const SUSPICIOUS_TLDS = ['.xyz', '.top', '.gq', '.tk', '.cf'];

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
    text: 'Likely Fake',
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
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeOutQuart: (t) => 1 - Math.pow(1 - t, 4),
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('checkForm');
  const input = document.getElementById('urlInput');
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
  const url = (urlInput?.value || '').trim();
  const resultDiv = document.getElementById('result');

  if (!resultDiv || !url) return;

  showLoadingState(resultDiv);
  hideActionButtons();

  const delayId = setTimeout(() => {
    if (signal.aborted) return;

    try {
      const parsedUrl = new URL(url);
      const verdict = analyzeUrl(parsedUrl);

      // Render card with header, reason, confidence, and gauge
      renderResultCard(resultDiv, verdict);

      // Animate gauge using new gauge.js function
      animateGauge(resultDiv, verdict.confidence, verdict.color, {
        duration: CONFIG.GAUGE_ANIMATION_DURATION,
        reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      });

      showActionButtons();
      storeResultSummary(resultDiv, parsedUrl, verdict);
      debugLog('Rendered verdict', verdict);
    } catch (err) {
      debugLog('Invalid URL parse error', err);
      const verdict = {
        verdictClass: 'unknown',
        verdictEmoji: '❓',
        verdictText: 'Invalid URL format.',
        reason: 'Please enter a valid link (e.g. https://example.com).',
        confidence: 0,
        color: VERDICT_CONFIG.unknown.color,
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
  if (SHORTENERS.some((s) => host === s || host.endsWith('.' + s))) {
    issues.push({ score: 30, message: 'URL shortener' });
  }

  // Suspicious TLD
  if (SUSPICIOUS_TLDS.some((t) => host.endsWith(t))) {
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
  const flags = issues.map((i) => i.message);
  issues.forEach((i) => (confidence -= i.score));
  confidence = Math.max(0, Math.min(100, confidence));

  const verdictType = flags.length > 0 || confidence < 60 ? 'fake' : 'safe';
  const verdictConfig = VERDICT_CONFIG[verdictType];

  return {
    verdictClass: verdictConfig.class,
    verdictEmoji: verdictConfig.emoji,
    verdictText: verdictConfig.text,
    reason: flags.length ? flags.join('; ') : 'No obvious suspicious patterns.',
    confidence,
    color: verdictConfig.color,
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
    const gaugeContainer = document.createElement('div');
    gaugeContainer.classList.add('fade-step');
    gaugeContainer.setAttribute('data-delay', '4');

    // createGauge will build the SVG and perform initial setup
    // Pass verdict.verdictClass so gauge.js can map to colors if needed
    createGauge(gaugeContainer, verdict.confidence, verdict.verdictClass);

    elements.push(gaugeContainer);
  }

  // Append all elements
  elements.forEach((el) => resultDiv.appendChild(el));

  // Staggered animation
  requestAnimationFrame(() => {
    resultDiv.classList.add('show');
    resultDiv.querySelectorAll('.fade-step').forEach((el) => {
      const delay = parseInt(el.getAttribute('data-delay') || '0', 10);
      setTimeout(() => el.classList.add('show'), delay * 80);
    });
  });
}

function storeResultSummary(resultDiv, parsedUrl, verdict) {
  const summary = `Checked: ${parsedUrl.href}
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
  const copyBtn = document.getElementById('copyBtn');
  const shareBtn = document.getElementById('shareBtn');
  const nativeBtn = document.getElementById('nativeShareBtn');
  if (copyBtn) copyBtn.style.display = 'none';
  if (shareBtn) shareBtn.style.display = 'none';
  if (nativeBtn) nativeBtn.style.display = 'none';
}

function showActionButtons() {
  const resultDiv = document.getElementById('result');
  const copyBtn = document.getElementById('copyBtn');
  const shareBtn = document.getElementById('shareBtn');
  const nativeBtn = document.getElementById('nativeShareBtn');

  if (copyBtn) copyBtn.style.display = 'inline-block';
  if (shareBtn) shareBtn.style.display = 'inline-block';
  if (navigator.share && nativeBtn) nativeBtn.style.display = 'inline-block';

  if (resultDiv) resultDiv.removeAttribute('aria-busy');
}

function abortCurrentOperation() {
  if (STATE.currentController) {
    try {
      STATE.currentController.abort();
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
  const summary = resultDiv?.dataset?.summary || resultDiv?.innerText || 'No result available.';

  if (!navigator.clipboard) {
    alert('Clipboard not supported. Select and copy manually.');
    return;
  }

  navigator.clipboard
    .writeText(summary)
    .then(() => {
      alert('Result copied! Paste it anywhere.');
    })
    .catch(() => {
      alert('Copy failed. Select and copy manually.');
    });
}

function shareToWhatsApp() {
  const resultDiv = document.getElementById('result');
  const summary = resultDiv?.dataset?.summary || resultDiv?.innerText || '';

  if (!summary) {
    alert('No result to share.');
    return;
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(summary)}`;
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
    navigator
      .share({
        title: 'Link Guardian Result',
        text: summary,
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.log('Share error:', err);
        }
      });
  } else {
    navigator.clipboard
      .writeText(summary)
      .then(() => {
        alert('Sharing not supported. Result copied instead!');
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
  const el = document.createElement(tag);
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
}

function debugLog(...args) {
  if (DEBUG) {
    console.log('[Link Guardian]', ...args);
  }
}
