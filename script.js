/* script.js — robust Link Guardian
   - Single, clean definitions (no nested duplicates)
   - Form submit bound via addEventListener
   - DOM-built SVG gauge (no stray duplicates)
   - Dynamic arc length via getTotalLength()
   - AbortController + RAF cancellation
   - Reduced-motion support and accessibility touches
   - Debug toggle via ?debug
*/

const DEBUG = new URLSearchParams(location.search).has('debug');
let submitLocked = false;
let currentController = null;
let currentRaf = null;
const SUBMIT_LOCK_MS = 600;

const SHORTENERS = ['bit.ly', 't.co', 'tinyurl.com', 'ow.ly', 'is.gd', 'buff.ly', 'goo.gl'];
const SUSPICIOUS_TLDS = ['.xyz', '.top', '.gq', '.tk', '.cf'];
const VERDICT_COLOR = { safe: '#28a745', fake: '#dc3545', unknown: '#ffc107' };

/* Wire form submit and keyboard helpers on DOM ready */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('checkForm');
  const input = document.getElementById('urlInput');

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
  }
});

/* Main entry */
function checkLink() {
  if (submitLocked) return;
  submitLocked = true;
  setTimeout(() => (submitLocked = false), SUBMIT_LOCK_MS);

  // Cancel previous run
  if (currentController) {
    try { currentController.abort(); } catch {}
    currentController = null;
  }
  if (currentRaf) {
    cancelAnimationFrame(currentRaf);
    currentRaf = null;
  }

  currentController = new AbortController();
  const { signal } = currentController;

  const urlInput = document.getElementById('urlInput');
  const url = (urlInput && urlInput.value || '').trim();
  const resultDiv = document.getElementById('result');
  const copyBtn = document.getElementById('copyBtn');
  const shareBtn = document.getElementById('shareBtn');
  const nativeShareBtn = document.getElementById('nativeShareBtn');

  if (!resultDiv) return;

  // Reset UI
  resultDiv.className = 'result-card';
  copyBtn && (copyBtn.style.display = 'none');
  shareBtn && (shareBtn.style.display = 'none');
  nativeShareBtn && (nativeShareBtn.style.display = 'none');
  resultDiv.innerHTML = '';
  resultDiv.classList.add('loading');

  // Cancellable simulated delay
  const delayMs = 900;
  const delayId = setTimeout(() => {
    if (signal.aborted) return;
    resultDiv.classList.remove('loading');

    // Validate URL
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      renderSimpleResult(resultDiv, {
        verdictClass: 'unknown',
        verdictEmoji: '❓',
        verdictText: 'Invalid URL format.',
        reason: 'Please enter a valid link (e.g. https://example.com).',
        confidence: 0
      });
      return;
    }

    // Heuristics
    const hrefLower = parsedUrl.href.toLowerCase();
    const host = parsedUrl.hostname.toLowerCase();

    const isPunycode = host.includes('xn--');
    const isShortener = SHORTENERS.some(s => host === s || host.endsWith('.' + s));
    const hasSuspiciousTld = SUSPICIOUS_TLDS.some(t => host.endsWith(t));
    const hasLoginKeyword = hrefLower.includes('login') || hrefLower.includes('signin') || hrefLower.includes('secure');

    // Score-based confidence
    let confidence = 85;
    const flags = [];
    if (isPunycode) { confidence -= 35; flags.push('Punycode (possible homograph)'); }
    if (isShortener) { confidence -= 30; flags.push('URL shortener'); }
    if (hasSuspiciousTld) { confidence -= 25; flags.push('Uncommon TLD'); }
    if (hasLoginKeyword) { confidence -= 20; flags.push('Login/secure keyword'); }
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') { confidence -= 40; flags.push('Unusual protocol'); }
    confidence = Math.max(0, Math.min(100, confidence));

    // Verdict
    let verdictClass = 'safe';
    let verdictEmoji = '✅';
    let verdictText = 'Likely Genuine';
    let reason = 'No obvious suspicious patterns.';
    if (flags.length > 0 || confidence < 60) {
      verdictClass = 'fake';
      verdictEmoji = '⚠️';
      verdictText = 'Likely Fake';
      reason = flags.length ? flags.join('; ') : 'Suspicious patterns detected.';
    }

    // Render and animate
    renderResultCard(resultDiv, { verdictClass, verdictEmoji, verdictText, reason, confidence });

    // Focus header for screen readers
    const headerEl = resultDiv.querySelector('.verdict-header');
    if (headerEl) {
      headerEl.setAttribute('tabindex', '-1');
      headerEl.focus({ preventScroll: true });
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const color = VERDICT_COLOR[verdictClass] || VERDICT_COLOR.unknown;
    animateGauge(resultDiv, confidence, color, { duration: 1100, reduceMotion, debug: DEBUG });

    // Store summary and show actions
    const summary = `Checked: ${parsedUrl.href}\n${verdictEmoji} ${verdictText}\nReason: ${reason}\nConfidence: ${confidence}%`;
    resultDiv.dataset.summary = summary;

    copyBtn && (copyBtn.style.display = 'inline-block');
    shareBtn && (shareBtn.style.display = 'inline-block');
    if (navigator.share && nativeShareBtn) nativeShareBtn.style.display = 'inline-block';

  }, delayMs);

  // Abort cleanup
  signal.addEventListener('abort', () => {
    clearTimeout(delayId);
    resultDiv.classList.remove('loading');
  });
}

/* Simple fallback render for invalid URLs */
function renderSimpleResult(root, { verdictClass, verdictEmoji, verdictText, reason, confidence }) {
  root.innerHTML = '';
  root.className = 'result-card';
  root.classList.add(verdictClass);

  const header = document.createElement('div');
  header.className = 'verdict-header fade-step';
  header.textContent = `${verdictEmoji} ${verdictText}`;

  const reasonEl = document.createElement('div');
  reasonEl.className = 'verdict-reason fade-step';
  reasonEl.textContent = reason;

  const conf = document.createElement('div');
  conf.className = 'confidence-label fade-step';
  conf.textContent = `Confidence: ${confidence}%`;

  root.appendChild(header);
  root.appendChild(reasonEl);
  root.appendChild(conf);

  requestAnimationFrame(() => {
    root.classList.add('show');
    root.querySelectorAll('.fade-step').forEach(el => el.classList.add('show'));
  });

  root.dataset.summary = `${verdictEmoji} ${verdictText}\n${reason}\nConfidence: ${confidence}%`;
}

/* Build result card and SVG gauge via DOM (avoids duplicates) */
function renderResultCard(root, { verdictClass, verdictEmoji, verdictText, reason, confidence }) {
  // Clear and set base class
  root.innerHTML = '';
  root.className = 'result-card';
  root.classList.add(verdictClass);

  // Header
  const header = document.createElement('div');
  header.className = 'verdict-header fade-step';
  header.textContent = `${verdictEmoji} ${verdictText}`;

  // Reason
  const reasonEl = document.createElement('div');
  reasonEl.className = 'verdict-reason fade-step';
  reasonEl.textContent = `Reason: ${reason}`;

  // Confidence label
  const conf = document.createElement('div');
  conf.className = 'confidence-label fade-step';
  conf.setAttribute('aria-live', 'polite');
  conf.textContent = `Confidence: ${confidence}%`;

  // Create SVG gauge via createElementNS
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'gauge fade-step');
  svg.setAttribute('viewBox', '0 0 200 110');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Confidence gauge');

  // Background arc
  const bgPath = document.createElementNS(SVG_NS, 'path');
  bgPath.setAttribute('class', 'gauge-bg');
  bgPath.setAttribute('d', 'M10 100 A90 90 0 0 1 190 100');
  bgPath.setAttribute('fill', 'none');
  bgPath.setAttribute('stroke', '#eee');
  bgPath.setAttribute('stroke-width', '20');

  // Dynamic arc
  const fillPath = document.createElementNS(SVG_NS, 'path');
  fillPath.setAttribute('class', 'gauge-fill');
  fillPath.setAttribute('d', 'M10 100 A90 90 0 0 1 190 100');
  fillPath.setAttribute('fill', 'none');
  fillPath.setAttribute('stroke-width', '20');
  fillPath.setAttribute('stroke-dasharray', '0 283');

  // Needle
  const needle = document.createElementNS(SVG_NS, 'line');
  needle.setAttribute('class', 'needle');
  needle.setAttribute('x1', '100');
  needle.setAttribute('y1', '100');
  needle.setAttribute('x2', '100');
  needle.setAttribute('y2', '20');
  needle.setAttribute('stroke', 'brown');
  needle.setAttribute('stroke-width', '4');
  needle.setAttribute('stroke-linecap', 'round');
  needle.setAttribute('transform', 'rotate(-90,100,100)');

  // Center cover
  const cover = document.createElementNS(SVG_NS, 'circle');
  cover.setAttribute('cx', '100');
  cover.setAttribute('cy', '100');
  cover.setAttribute('r', '8');
  cover.setAttribute('fill', '#333');

  // Append in order
  svg.appendChild(bgPath);
  svg.appendChild(fillPath);
  svg.appendChild(needle);
  svg.appendChild(cover);

  // Append to root
  root.appendChild(header);
  root.appendChild(reasonEl);
  root.appendChild(conf);
  root.appendChild(svg);

  // Trigger fade-in
  requestAnimationFrame(() => {
    root.classList.add('show');
    root.querySelectorAll('.fade-step').forEach(el => el.classList.add('show'));
  });
}

/* Animate gauge: uses background path length for arc math */
function animateGauge(root, confidence, color, options = {}) {
  const { duration = 1200, reduceMotion = false, debug = false } = options;
  const fill = root.querySelector('.gauge-fill');
  const needle = root.querySelector('.needle');
  const label = root.querySelector('.confidence-label');
  const pathEl = root.querySelector('.gauge-bg');

  if (!fill || !needle || !label || !pathEl) return;

  let maxArc;
  try { maxArc = pathEl.getTotalLength(); } catch { maxArc = 283; }

  const safeConfidence = Math.max(0, Math.min(100, Number(confidence) || 0));
  const arc = (safeConfidence / 100) * maxArc;
  const rawTarget = -90 + (safeConfidence / 100) * 180;
  const targetAngle = Math.max(-90, Math.min(90, rawTarget));

  fill.setAttribute('stroke', color);

  if (reduceMotion) {
    fill.setAttribute('stroke-dasharray', `${arc} ${maxArc - arc}`);
    needle.setAttribute('transform', `rotate(${targetAngle},100,100)`);
    label.textContent = `Confidence: ${safeConfidence}%`;
    return;
  }

  if (currentRaf) {
    cancelAnimationFrame(currentRaf);
    currentRaf = null;
  }

  needle.style.transition = 'none';

  let start = null;
  function frame(now) {
    if (!start) start = now;
    const elapsed = now - start;
    const progress = Math.min(Math.max(elapsed / duration, 0), 1);
    const eased = 1 - Math.pow(1 - progress, 3);

    const currentArc = arc * eased;
    fill.setAttribute('stroke-dasharray', `${currentArc} ${maxArc - currentArc}`);

    let angle = -90 + (targetAngle - (-90)) * eased;
    angle = Math.max(-90, Math.min(targetAngle, angle));
    needle.setAttribute('transform', `rotate(${angle},100,100)`);

    const currentValue = Math.min(safeConfidence, Math.round(safeConfidence * eased));
    label.textContent = `Confidence: ${currentValue}%`;

    if (debug) console.log({ progress, eased, angle, targetAngle });

    if (progress < 1) {
      currentRaf = requestAnimationFrame(frame);
    } else {
      needle.setAttribute('transform', `rotate(${targetAngle},100,100)`);
      label.textContent = `Confidence: ${safeConfidence}%`;
      label.classList.add('pulse', 'glow');
      setTimeout(() => label.classList.remove('pulse', 'glow'), 800);
      currentRaf = null;
    }
  }

  currentRaf = requestAnimationFrame(frame);
}

/* Copy / share helpers */
function copyResult() {
  const resultDiv = document.getElementById('result');
  const summary = resultDiv?.dataset?.summary || resultDiv?.innerText || 'No result available.';
  if (!navigator.clipboard) {
    alert('Clipboard not supported here. Select and copy manually.');
    return;
  }
  navigator.clipboard.writeText(summary).then(() => {
    alert('Result copied! Paste it anywhere.');
  }).catch(() => {
    alert('Copy failed. You can select and copy the result manually.');
  });
}

function shareToWhatsApp() {
  const resultDiv = document.getElementById('result');
  const summary = resultDiv?.dataset?.summary || resultDiv?.innerText || '';
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(summary)}`;
  window.open(whatsappUrl, '_blank');
}

function shareNative() {
  const resultDiv = document.getElementById('result');
  const summary = resultDiv?.dataset?.summary || resultDiv?.innerText || '';
  if (navigator.share) {
    navigator.share({ title: 'Link Guardian Result', text: summary }).catch(err => console.log('Share cancelled', err));
  } else {
    navigator.clipboard.writeText(summary).then(() => {
      alert('Sharing not supported here. Result copied instead!');
    }).catch(() => {
      alert('Unable to share or copy automatically.');
    });
  }
}
