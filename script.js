function checkLink() {
  const url = document.getElementById('urlInput').value.trim();
  const resultDiv = document.getElementById('result');
  const copyBtn = document.getElementById('copyBtn');
  const shareBtn = document.getElementById('shareBtn');
  const nativeShareBtn = document.getElementById('nativeShareBtn');

  // Reset
  resultDiv.className = "result-card";
  copyBtn.style.display = "none";
  shareBtn.style.display = "none";
  nativeShareBtn.style.display = "none";

  // Show shimmer while "checking"
  resultDiv.innerHTML = "";
  resultDiv.classList.add("loading");

  setTimeout(() => {
    resultDiv.classList.remove("loading");

    // ✅ Step 1: Validate URL
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (e) {
      resultDiv.innerHTML = `
        <div class="verdict-header">❓ Invalid URL format.</div>
        <div class="verdict-reason">Please enter a valid link (e.g. https://example.com).</div>
      `;
      resultDiv.classList.add("unknown", "show");
      return;
    }

    let verdictText = "";
    let verdictEmoji = "";
    let reason = "";
    let confidence = 50; // default
    let verdictClass = "unknown";

    // Simple placeholder logic
    if (url.includes("secure") || url.includes("login") || url.includes(".xyz")) {
      verdictEmoji = "⚠️";
      verdictText = "Likely Fake";
      reason = "Suspicious keywords or uncommon domain.";
      verdictClass = "fake";
      confidence = 30;
    } else {
      verdictEmoji = "✅";
      verdictText = "Likely Genuine";
      reason = "No obvious suspicious patterns.";
      verdictClass = "safe";
      confidence = 80;
    }

    resultDiv.classList.add(verdictClass);

    // Structured verdict card with SVG gauge
    resultDiv.innerHTML = `
      <div class="verdict-header">${verdictEmoji} ${verdictText}</div>
      <div class="verdict-reason">Reason: ${reason}</div>
      <div class="confidence-label">Confidence: ${confidence}%</div>
      <svg class="gauge" viewBox="0 0 200 110" role="img" aria-label="Confidence gauge">
        <!-- Background arc -->
        <path d="M10 100 A90 90 0 0 1 190 100"
              fill="none" stroke="#eee" stroke-width="20"/>
        <!-- Dynamic arc -->
        <path id="gauge-fill"
              d="M10 100 A90 90 0 0 1 190 100"
              fill="none" stroke="green" stroke-width="20"
              stroke-dasharray="0 283"/>
        <!-- Needle -->
        <line id="needle" x1="100" y1="100" x2="100" y2="20"
              stroke="brown" stroke-width="4" stroke-linecap="round"
              transform="rotate(-90,100,100)"/>
        <!-- Center cover -->
        <circle cx="100" cy="100" r="8" fill="#333"/>
      </svg>
    `;

    // Animate gauge
    const fill = resultDiv.querySelector("#gauge-fill");
    const needle = resultDiv.querySelector("#needle");
    const maxArc = 283; // semicircle length
    const arc = (confidence / 100) * maxArc;

    // Pick color based on verdict
    let strokeColor = "orange";
    if (verdictClass === "safe") strokeColor = "green";
    if (verdictClass === "fake") strokeColor = "red";

    setTimeout(() => {
      fill.setAttribute("stroke-dasharray", `${arc} ${maxArc - arc}`);
      fill.setAttribute("stroke", strokeColor);
      const angle = -90 + (confidence / 100) * 180;
      needle.setAttribute("transform", `rotate(${angle},100,100)`);
    }, 100);

    // Store full summary for sharing
    const summary = 
`Checked: ${parsedUrl.href}
${verdictEmoji} ${verdictText}
Reason: ${reason}
Confidence: ${confidence}%`;
    resultDiv.dataset.summary = summary;

    // Trigger fade-in
    resultDiv.classList.add("show");

    // Show action buttons
    copyBtn.style.display = "inline-block";
    shareBtn.style.display = "inline-block";
    if (navigator.share) {
      nativeShareBtn.style.display = "inline-block";
    }
  }, 1200); // 1.2s shimmer before verdict
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
