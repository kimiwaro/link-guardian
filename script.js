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
        <div class="verdict-header">\u2753 Invalid URL format.</div>
        <div class="verdict-reason">Please enter a valid link (e.g. https://example.com).</div>
      `;
      resultDiv.classList.add("unknown", "show");
      return;
    }

    let verdictText = "";
    let verdictEmoji = "";
    let reason = "";

    // Simple placeholder logic
    if (url.includes("secure") || url.includes("login") || url.includes(".xyz")) {
      verdictEmoji = "\u26A0\uFE0F"; // ⚠️
      verdictText = "Likely Fake";
      reason = "Suspicious keywords or uncommon domain.";
      resultDiv.classList.add("fake");
    } else {
      verdictEmoji = "\u2705"; // ✅
      verdictText = "Likely Genuine";
      reason = "No obvious suspicious patterns.";
      resultDiv.classList.add("safe");
    }

    // Structured verdict card
    resultDiv.innerHTML = `
      <div class="verdict-header">${verdictEmoji} ${verdictText}</div>
      <div class="verdict-reason">Reason: ${reason}</div>
    `;

    // Store full summary for sharing
    const summary = 
`Checked: ${parsedUrl.href}
${verdictEmoji} ${verdictText}
Reason: ${reason}`;
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
