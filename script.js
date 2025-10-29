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

    // Simple placeholder logic
    if (url.includes("secure") || url.includes("login") || url.includes(".xyz")) {
      verdictEmoji = "⚠️";
      verdictText = "Likely Fake";
      reason = "Suspicious keywords or uncommon domain.";
      resultDiv.classList.add("fake");
      confidence = 30;
    } else {
      verdictEmoji = "✅";
      verdictText = "Likely Genuine";
      reason = "No obvious suspicious patterns.";
      resultDiv.classList.add("safe");
      confidence = 80;
    }

    // Structured verdict card with confidence bar
    resultDiv.innerHTML = `
      <div class="verdict-header">${verdictEmoji} ${verdictText}</div>
      <div class="verdict-reason">Reason: ${reason}</div>
      <div class="confidence-label">Confidence: ${confidence}%</div>
      <div class="confidence-bar">
        <div class="confidence-fill ${resultDiv.classList.contains("safe") ? "safe" : resultDiv.classList.contains("fake") ? "fake" : "unknown"}"></div>
      </div>
    `;

    // Animate confidence fill
    const fill = resultDiv.querySelector(".confidence-fill");
    setTimeout(() => {
      fill.style.width = confidence + "%";
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

// ✅ Step 2: Native Share API (mobile-friendly)
function shareNative() {
  const resultDiv = document.getElementById('result');
  const summary = resultDiv.dataset.summary || resultDiv.innerText;

  if (navigator.share) {
    navigator.share({
      title: "Link Guardian Result",
      text: summary
    }).catch(err => console.log("Share cancelled", err));
  } else {
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(summary).then(() => {
      alert("Sharing not supported here. Result copied instead!");
    });
  }
}
