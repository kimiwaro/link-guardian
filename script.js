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

    <!-- Tick marks -->
    <line x1="100" y1="100" x2="100" y2="80" stroke="#666" stroke-width="2"/>
    <line x1="55" y1="95" x2="45" y2="75" stroke="#666" stroke-width="2"/>
    <line x1="145" y1="95" x2="155" y2="75" stroke="#666" stroke-width="2"/>

    <!-- Labels -->
    <text x="40" y="70" font-size="10" fill="#444">0%</text>
    <text x="95" y="65" font-size="10" fill="#444">50%</text>
    <text x="150" y="70" font-size="10" fill="#444">100%</text>

    <!-- Needle -->
    <line class="needle" x1="100" y1="100" x2="100" y2="20"
          stroke="brown" stroke-width="4" stroke-linecap="round"
          transform="rotate(-90,100,100)"/>

    <!-- Center cover -->
    <circle cx="100" cy="100" r="8" fill="#333"/>
  </svg>
`;

    // ✅ Step 4: Animate gauge
    const fill = resultDiv.querySelector(".gauge-fill");
    const needle = resultDiv.querySelector(".needle");
    const maxArc = 283;
    const arc = (confidence / 100) * maxArc;

    let strokeColor = verdictClass === "safe" ? "green" :
                      verdictClass === "fake" ? "red" : "orange";

    setTimeout(() => {
      fill.setAttribute("stroke-dasharray", `${arc} ${maxArc - arc}`);
      fill.setAttribute("stroke", strokeColor);
      const angle = -90 + (confidence / 100) * 180;
      needle.setAttribute("transform", `rotate(${angle},100,100)`);
    }, 300); // start after fade-in

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
