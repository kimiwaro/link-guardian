function checkLink() {
  const debug = false; // set true to log progress/angle for debugging
  const url = document.getElementById('urlInput').value.trim();
  const resultDiv = document.getElementById('result');
  const copyBtn = document.getElementById('copyBtn');
  const shareBtn = document.getElementById('shareBtn');
  const nativeShareBtn = document.getElementById('nativeShareBtn');

  // Reset UI
  resultDiv.className = "result-card";
  copyBtn.style.display = shareBtn.style.display = nativeShareBtn.style.display = "none";
  resultDiv.innerHTML = "";
  resultDiv.classList.add("loading");

  // Cancel any previous animations/timeouts stored on resultDiv
  if (resultDiv._raf) {
    cancelAnimationFrame(resultDiv._raf);
    resultDiv._raf = null;
  }
  if (resultDiv._timeout) {
    clearTimeout(resultDiv._timeout);
    resultDiv._timeout = null;
  }

  // Simulate work / show shimmer, then show result
  resultDiv._timeout = setTimeout(() => {
    resultDiv._timeout = null;
    resultDiv.classList.remove("loading");

    // Step 1: Validate URL
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      resultDiv.innerHTML = `
        <div class="verdict-header fade-step">❓ Invalid URL format.</div>
        <div class="verdict-reason fade-step">Please enter a valid link (e.g. https://example.com).</div>
      `;
      resultDiv.classList.add("unknown", "show");
      // show any fade steps
      resultDiv.querySelectorAll(".fade-step").forEach(el => {
        requestAnimationFrame(() => el.classList.add("show"));
      });
      return;
    }

    // Step 2: Verdict logic (simple heuristic)
    let verdictClass = "safe";
    let verdictEmoji = "✅";
    let verdictText = "Likely Genuine";
    let reason = "No obvious suspicious patterns.";
    let confidence = 80;

    if (url.includes("secure") || url.includes("login") || url.includes(".xyz")) {
      verdictClass = "fake";
      verdictEmoji = "⚠️";
      verdictText = "Likely Fake";
      reason = "Suspicious keywords or uncommon domain.";
      confidence = 30;
    }

    resultDiv.classList.add(verdictClass);

    // Step 3: Render verdict card (staggered fade steps)
    resultDiv.innerHTML = `
      <div class="verdict-header fade-step">${verdictEmoji} ${verdictText}</div>
      <div class="verdict-reason fade-step">Reason: ${reason}</div>
      <div class="confidence-label fade-step" aria-live="polite">Confidence: ${confidence}%</div>

      <svg class="gauge fade-step" viewBox="0 0 200 110" role="img" aria-label="Confidence gauge">
        <!-- Background arc -->
        <path d="M10 100 A90 90 0 0 1 190 100" fill="none" stroke="#eee" stroke-width="20"/>
        <!-- Dynamic arc -->
        <path class="gauge-fill" d="M10 100 A90 90 0 0 1 190 100"
              fill="none" stroke-width="20" stroke-dasharray="0 283"/>
        <!-- Needle -->
        <line class="needle" x1="100" y1="100" x2="100" y2="20"
              stroke="brown" stroke-width="4" stroke-linecap="round" transform="rotate(-90,100,100)"/>
        <!-- Center cover -->
        <circle cx="100" cy="100" r="8" fill="#333"/>
      </svg>
    `;

    // make sure fade steps reveal
    resultDiv.classList.add("show");
    resultDiv.querySelectorAll(".fade-step").forEach(el => {
      requestAnimationFrame(() => el.classList.add("show"));
    });

    // Step 4: Animate gauge (strict, no overshoot)
    const fill = resultDiv.querySelector(".gauge-fill");
    const needle = resultDiv.querySelector(".needle");
    const label = resultDiv.querySelector(".confidence-label");

    // Defensive: ensure elements exist
    if (!fill || !needle || !label) return;

    // clamp confidence 0..100
    const safeConfidence = Math.max(0, Math.min(100, Number(confidence) || 0));
    const maxArc = 283;
    const arc = (safeConfidence / 100) * maxArc;

    const strokeColor = verdictClass === "safe" ? "green" :
                        verdictClass === "fake" ? "red" : "orange";

    const duration = 1200;
    // set initial stroke to match verdict immediately
    fill.setAttribute("stroke", strokeColor);
    // clear any existing transform on needle and ensure CSS does not animate it
    needle.style.transition = "none";

    // ensure any previous RAF is cancelled before starting new run
    if (resultDiv._raf) {
      cancelAnimationFrame(resultDiv._raf);
      resultDiv._raf = null;
    }

    // Use a fresh startTime so animation timing is correct
    const runStart = performance.now();
    function animateFrame(now) {
      const elapsed = now - runStart;
      const progress = Math.min(Math.max(elapsed / duration, 0), 1);

      // Ease-out (never exceed 1)
      const eased = 1 - Math.pow(1 - progress, 3);

      // Arc fill (set per frame)
      const currentArc = arc * eased;
      fill.setAttribute("stroke-dasharray", `${currentArc} ${maxArc - currentArc}`);

      // Calculate target angle and LERP from -90 to targetAngle
      const targetAngle = -90 + (safeConfidence / 100) * 180;
      let angle = -90 + (targetAngle - (-90)) * eased;

      // Hard clamp each frame: never go below -90 or above targetAngle
      angle = Math.max(-90, Math.min(targetAngle, angle));

      // Apply transform
      needle.setAttribute("transform", `rotate(${angle},100,100)`);

      // Confidence text (ease-out)
      const currentValue = Math.min(safeConfidence, Math.round(safeConfidence * eased));
      label.textContent = `Confidence: ${currentValue}%`;

      if (debug) console.log(`p=${progress.toFixed(3)} eased=${eased.toFixed(3)} angle=${angle.toFixed(2)} target=${targetAngle.toFixed(2)}`);

      if (progress < 1) {
        resultDiv._raf = requestAnimationFrame(animateFrame);
      } else {
        // Final settle (explicit)
        needle.setAttribute("transform", `rotate(${targetAngle},100,100)`);
        label.textContent = `Confidence: ${safeConfidence}%`;

        // Pulse hook
        label.classList.add("pulse");
        setTimeout(() => label.classList.remove("pulse"), 600);

        // cleanup
        resultDiv._raf = null;
      }
    }

    // start the animation after a small visual delay so fade-in is noticed
    resultDiv._raf = requestAnimationFrame(animateFrame);

    // Step 5: Store summary for share/copy
    const summary = `Checked: ${parsedUrl.href}
${verdictEmoji} ${verdictText}
Reason: ${reason}
Confidence: ${safeConfidence}%`;
    resultDiv.dataset.summary = summary;

    // Step 6 & 7: show action buttons
    copyBtn.style.display = shareBtn.style.display = "inline-block";
    if (navigator.share) nativeShareBtn.style.display = "inline-block";

  }, 1200); // end of simulated processing timeout
}

// Copy / share helpers (unchanged)
function copyResult() {
  const resultDiv = document.getElementById('result');
  const summary = resultDiv.dataset.summary || resultDiv.innerText;
  navigator.clipboard.writeText(summary).then(() => {
    alert("Result copied! Paste it anywhere.");
  });
}

function shareToWhatsApp() {
  const resultDiv = document.getElementById('result');
  const summary = resultDiv.dataset.summary || resultDiv.innerText;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(summary)}`;
  window.open(whatsappUrl, "_blank");
}

function shareNative() {
  const resultDiv = document.getElementById('result');
  const summary = resultDiv.dataset.summary || resultDiv.innerText;
  if (navigator.share) {
    navigator.share({ title: "Link Guardian Result", text: summary }).catch(err => console.log("Share cancelled", err));
  } else {
    navigator.clipboard.writeText(summary).then(() => {
      alert("Sharing not supported here. Result copied instead!");
    });
  }
}
