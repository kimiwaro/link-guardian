/* script.js — polished, robust Link Guardian logic
   - Dynamic arc length (getTotalLength)
   - animateGauge(root, confidence, color) reusable
   - AbortController to cancel previous runs
   - Reduced-motion respect
   - Simple heuristics (punycode, shorteners, suspicious TLDs)
   - Accessibility: focus result header, aria-live, keyboard escape
   - Debug toggle via ?debug in URL
*/

const DEBUG = new URLSearchParams(location.search).has('debug');
let submitLocked = false;
let currentController = null;
let currentRaf = null;

// Small debounce to prevent double submits
const SUBMIT_LOCK_MS = 600;

// Shortener list and suspicious TLDs (easy to extend)
const SHORTENERS = ['bit.ly', 't.co', 'tinyurl.com', 'ow.ly', 'is.gd', 'buff.ly', 'goo.gl'];
const SUSPICIOUS_TLDS = ['.xyz', '.top', '.gq', '.tk', '.cf'];

// Map verdict -> color
const VERDICT_COLOR = {
  safe: '#28a745',
  fake: '#dc3545',
  unknown: '#ffc107'
};

// Init keyboard helpers
(function initKeyboard() {
  const input = document.getElementById('urlInput');
  if (!input) return;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') input.value = '';
  });
})();

function checkLink() {
  // Debounce submissions
  if (submitLocked) return;
  submitLocked = true;
  setTimeout(() => (submitLocked = false), SUBMIT_LOCK_MS);

  // Cancel any previous run
  if (currentController) {
    try { currentController.abort(); } catch (e) {}
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

  // Reset UI
  resultDiv.className = 'result-card';
  copyBtn.style.display = shareBtn.style.display = nativeShareBtn.style.display = 'none';
  resultDiv.innerHTML = '';
  resultDiv.classList.add('loading');

  // Cancellable delay (simulated processing)
  const delayMs = 900;
  const delayId = setTimeout(() => {
    // If aborted, stop
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

    // Heuristics (case-insensitive)
    const hrefLower = parsedUrl.href.toLowerCase();
    const host = parsedUrl.hostname.toLowerCase();

    const isPunycode = host.includes('xn--');
    const isShortener = SHORTENERS.some(s => host === s || host.endsWith('.' + s));
    const hasSuspiciousTld = SUSPICIOUS_TLDS.some(t => host.endsWith(t));
    const hasLoginKeyword = hrefLower.includes('login') || hrefLower.includes('signin') || hrefLower.includes('secure');

    // Score-based confidence (start at 85, subtract for flags)
    let confidence = 85;
    let flags = [];

    if (isPunycode) { confidence -= 35; flags.push('Punycode (possible homograph)'); }
    if (isShortener) { confidence -= 30; flags.push('URL shortener'); }
    if (hasSuspiciousTld) { confidence -= 25; flags.push('Uncommon TLD'); }
    if (hasLoginKeyword) { confidence -= 20; flags.push('Login/secure keyword'); }
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') { confidence -= 40; flags.push('Unusual protocol'); }

    // Bound confidence
    confidence = Math.max(0, Math.min(100, confidence));

    // Decide verdict
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

    // Render DOM safely (no innerHTML with user content)
    renderResultCard(resultDiv, {
      verdictClass, verdictEmoji, verdictText, reason, confidence
    });

    // Focus header for screen readers
    const headerEl = resultDiv.querySelector('.verdict-header');
    if (headerEl) {
      headerEl.setAttribute('tabindex', '-1');
      headerEl.focus({ preventScroll: true });
    }

    // Animate gauge (respect reduced motion)
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const color = VERDICT_COLOR[verdictClass] || VERDICT_COLOR.unknown;
    animateGauge(resultDiv, confidence, color, { duration: 1100, reduceMotion, debug: DEBUG });

    // Store summary for sharing
    const summary = `Checked: ${parsedUrl.href}\n${verdictEmoji} ${verdictText}\nReason: ${reason}\nConfidence: ${confidence}%`;
    resultDiv.dataset.summary = summary;

    // Show action buttons
    copyBtn.style.display = shareBtn.style.display = 'inline-block';
    if (navigator.share) nativeShareBtn.style.display = 'inline-block';

  }, delayMs);

  // If aborted externally, clear the timeout
  signal.addEventListener('abort', () => {
    clearTimeout(delayId);
    // cleanup UI if needed
    resultDiv.classList.remove('loading');
  });
}

// Render a simple fallback result (invalid URL)
function renderSimpleResult(root, { verdictClass, verdictEmoji, verdictText, reason, confidence }) {
  root.innerHTML = '';
  root.classList.add(verdictClass, 'show');
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
  // reveal
  requestAnimationFrame(() => {
    root.classList.add('show');
    root.querySelectorAll('.fade-step').forEach(el => el.classList.add('show'));
  });
  root.dataset.summary = `${verdictEmoji} ${verdictText}\n${reason}\nConfidence: ${confidence}%`;
}

// Build result card DOM safely and append to root
function renderResultCard(root, { verdictClass, verdictEmoji, verdictText, reason, confidence }) {
  root.innerHTML = '';
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

  // SVG gauge (string is safe here because we control the markup)
  const svgWrapper = document.createElement('div');
  svgWrapper.className = 'fade-step';
  svgWrapper.innerHTML = `
    <svg class="gauge" viewBox="0 0 200 110" role="img" aria-label="Confidence gauge">
      <path class="gauge-bg" d="M10 100 A90 90 0 0 1 190 100" fill="none" stroke="#eee" stroke-width="20"/>
      <path class="gauge-fill" d="M10 100 A90 90 0 0 1 190 100" fill="none" stroke-width="20" stroke-dasharray="0 283"/>
      <line class="needle" x1="100" y1="100" x2="100" y2="20" stroke="brown" stroke-width="4" stroke-linecap="round" transform="rotate(-90,100,100)"/>
      <circle cx="100" cy="100" r="8" fill="#333"/>
    </svg>
  `;

  // Append in order
  root.appendChild(header);
  root.appendChild(reasonEl);
  root.appendChild(conf);
  root.appendChild(svgWrapper);

  // Trigger fade-in
  requestAnimationFrame(() => {
    root.classList.add('show');
    root.querySelectorAll('.fade-step').forEach(el => el.classList.add('show'));
  });
}

// animateGauge: root is the resultDiv containing the gauge elements
function animateGauge(root, confidence, color, options = {}) {
  const { duration = 1200, reduceMotion = false, debug = false } = options;
  const fill = root.querySelector('.gauge-fill');
  const needle = root.querySelector('.needle');
  const label = root.querySelector('.confidence-label');
  const path = root.querySelector('.gauge-bg'); // background arc path

  if (!fill || !needle || !label || !path) return;

  // Dynamic path length
  let maxArc;
  try {
    maxArc = path.getTotalLength();
  } catch (e) {
    maxArc = 283; // fallback
  }

  const safeConfidence = Math.max(0, Math.min(100, Number(confidence) || 0));
  const arc = (safeConfidence / 100) * maxArc;

  // target angle clamped to [-90, 90]
  const rawTarget = -90 + (safeConfidence / 100) * 180;
  const targetAngle = Math.max(-90, Math.min(90, rawTarget));

  // Apply color immediately
  fill.setAttribute('stroke', color);

  // If user prefers reduced motion, jump to final state
  if (reduceMotion) {
    fill.setAttribute('stroke-dasharray', `${arc} ${maxArc - arc}`);
    needle.setAttribute('transform', `rotate(${targetAngle},100,100)`);
    label.textContent = `Confidence: ${safeConfidence}%`;
    return;
  }

  // Cancel any previous RAF for this root
  if (currentRaf) {
    cancelAnimationFrame(currentRaf);
    currentRaf = null;
  }

  // Ensure CSS won't animate the needle
  needle.style.transition = 'none';

  let start = null;
  function frame(now) {
    if (!start) start = now;
    const elapsed = now - start;
    const progress = Math.min(Math.max(elapsed / duration, 0), 1);

    // Ease-out
    const eased = 1 - Math.pow(1 - progress, 3);

    // Arc
    const currentArc = arc * eased;
    fill.setAttribute('stroke-dasharray', `${currentArc} ${maxArc - currentArc}`);

    // Angle LERP and clamp
    let angle = -90 + (targetAngle - (-90)) * eased;
    angle = Math.max(-90, Math.min(targetAngle, angle));
    needle.setAttribute('transform', `rotate(${angle},100,100)`);

    // Confidence text
    const currentValue = Math.min(safeConfidence, Math.round(safeConfidence * eased));
    label.textContent = `Confidence: ${currentValue}%`;

    if (debug) console.log({ progress, eased, angle, targetAngle });

    if (progress < 1) {
      currentRaf = requestAnimationFrame(frame);
    } else {
      // Final settle
      needle.setAttribute('transform', `rotate(${targetAngle},100,100)`);
      label.textContent = `Confidence: ${safeConfidence}%`;
      label.classList.add('pulse', 'glow');
      setTimeout(() => label.classList.remove('pulse', 'glow'), 800);
      currentRaf = null;
    }
  }

  currentRaf = requestAnimationFrame(frame);
}

// Copy / share helpers
function copyResult() {
  const resultDiv = document.getElementById('result');
  const summary = resultDiv.dataset.summary || resultDiv.innerText || 'No result available.';
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
  const summary = resultDiv.dataset.summary || resultDiv.innerText || '';
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(summary)}`;
  window.open(whatsappUrl, '_blank');
}

function shareNative() {
  const resultDiv = document.getElementById('result');
  const summary = resultDiv.dataset.summary || resultDiv.innerText || '';
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
