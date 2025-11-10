function checkLink() {
  const url = document.getElementById('urlInput').value.trim();
  const resultDiv = document.getElementById('result');
  const copyBtn = document.getElementById('copyBtn');
  const shareBtn = document.getElementById('shareBtn');
  const nativeShareBtn = document.getElementById('nativeShareBtn');

  // Reset
  resultDiv.className = "result-card";
  copyBtn.style.display = shareBtn.style.display = nativeShareBtn.style.display = "none";
  resultDiv.innerHTML = "";
  resultDiv.classList.add("loading");

  setTimeout(() => {
    resultDiv.classList.remove("loading");

    // ✅ Step 1: Validate URL
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      resultDiv.innerHTML = `
        <div class="verdict-header fade-step">❓ Invalid URL format.</div>
        <div class="verdict-reason fade-step">Please enter a valid link (e.g. https://example.com).</div>
      `;
      resultDiv.classList.add("unknown", "show");
      return;
    }

    // ✅ Step 2: Verdict logic
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

    // ✅ Step 3: Verdict card with staggered fade-steps
    resultDiv.innerHTML = `
      <div class="verdict-header fade-step">${verdictEmoji} ${verdictText}</div>
      <div class="verdict-reason fade-step">Reason: ${reason}</div>
      <div class="confidence-label fade-step">Confidence: ${confidence}%</div>

      <svg class="gauge fade-step" viewBox="0 0 200 110" role="img" aria-label="Confidence gauge">
        <!-- Background arc -->
        <path d="M10 100 A90 90 0 0 1 190 100"
              fill="none" stroke="#eee" stroke-width="20"/>

        <!-- Dynamic arc -->
        <path class="gauge-fill"
              d="M10 100 A90 90 0 0 1 190 100"
              fill="none" stroke-width="20"
              stroke-dasharray="0 283"/>

        <!-- Needle -->
        <line class="needle" x1="100" y1="100" x2="100" y2="20"
              stroke="brown" stroke-width="4" stroke-linecap="round"
              transform="rotate(-90,100,100)"/>

        <!-- Center cover -->
        <circle cx="100" cy="100" r="8" fill="#333"/>
      </svg>
    `;

// ✅ Step 4: Animate gauge with strict clamps (no bounce, no overshoot)
const fill = resultDiv.querySelector(".gauge-fill");
const needle = resultDiv.querySelector(".needle");
const label = resultDiv.querySelector(".confidence-label");

// 1) Clamp confidence to 0–100 to prevent math overshoot
const safeConfidence = Math.max(0, Math.min(100, confidence));

const maxArc = 283;
const arc = (safeConfidence / 100) * maxArc;

let strokeColor = verdictClass === "safe" ? "green" :
                  verdictClass === "fake" ? "red" : "orange";

const duration = 1200;

// 2) Kill any lingering animations from previous runs
if (resultDiv._raf) cancelAnimationFrame(resultDiv._raf);
if (resultDiv._timeout) clearTimeout(resultDiv._timeout);

const startTime = performance.now();

resultDiv._timeout = setTimeout(() => {
  function animate(time) {
    const elapsed = time - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease-out curve (never > 1)
    const eased = 1 - Math.pow(1 - progress, 3);

    // Arc fill
    const currentArc = arc * eased;
    fill.setAttribute("stroke-dasharray", `${currentArc} ${maxArc - currentArc}`);
    fill.setAttribute("stroke", strokeColor);

    // Angle: strict LERP from -90° to target, clamped every frame
    const targetAngle = -90 + (safeConfidence / 100) * 180;
    let angle = -90 + (targetAngle + 90) * eased;

    // 3) Hard clamp angle to dial bounds
    angle = Math.max(-90, Math.min(90, angle));

    needle.setAttribute("transform", `rotate(${angle},100,100)`);

    // Confidence number (clamped)
    const currentValue = Math.min(safeConfidence, Math.round(safeConfidence * eased));
    label.textContent = `Confidence: ${currentValue}%`;

    if (progress < 1) {
      resultDiv._raf = requestAnimationFrame(animate);
    } else {
      // Final settle: clamp again for absolute safety
      const finalAngle = Math.max(-90, Math.min(90, targetAngle));
      needle.setAttribute("transform", `rotate(${finalAngle},100,100)`);
      label.textContent = `Confidence: ${safeConfidence}%`;

      label.classList.add("pulse");
      setTimeout(() => label.classList.remove("pulse"), 600);

      // Clear trackers
      resultDiv._raf = null;
      resultDiv._timeout = null;
    }
  }
  resultDiv._raf = requestAnimationFrame(animate);
}, 300);



    // ✅ Step 5: Store summary
    const summary = 
`Checked: ${parsedUrl.href}
${verdictEmoji} ${verdictText}
Reason: ${reason}
Confidence: ${confidence}%`;
    resultDiv.dataset.summary = summary;

    // ✅ Step 6: Trigger fade-in
    resultDiv.classList.add("show");

    resultDiv.querySelectorAll(".fade-step").forEach(el => {
      requestAnimationFrame(() => el.classList.add("show"));
    });

    // ✅ Step 7: Show action buttons
    copyBtn.style.display = shareBtn.style.display = "inline-block";
    if (navigator.share) nativeShareBtn.style.display = "inline-block";
  }, 1200);
}



// ✅ Copy Result
function copyResult() {
  const resultDiv = document.getElementById('result');
  const summary = resultDiv.dataset.summary || resultDiv.innerText;

  navigator.clipboard.writeText(summary).then(() => {
    alert("Result copied! Paste it anywhere.");
  });
}

// ✅ Share to WhatsApp
function shareToWhatsApp() {
  const resultDiv = document.getElementById('result');
  const summary = resultDiv.dataset.summary || resultDiv.innerText;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(summary)}`;
  window.open(whatsappUrl, "_blank");
}

// ✅ Native Share API (mobile-friendly)
function shareNative() {
  const resultDiv = document.getElementById('result');
  const summary = resultDiv.dataset.summary || resultDiv.innerText;

  if (navigator.share) {
    navigator.share({
      title: "Link Guardian Result",
      text: summary
    }).catch(err => console.log("Share cancelled", err));
  } else {
    navigator.clipboard.writeText(summary).then(() => {
      alert("Sharing not supported here. Result copied instead!");
    });
  }
}
