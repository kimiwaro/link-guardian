function checkLink() {
  const url = document.getElementById('urlInput').value.trim();
  const resultDiv = document.getElementById('result');
  const copyBtn = document.getElementById('copyBtn');
  const shareBtn = document.getElementById('shareBtn');

  // Reset classes
  resultDiv.className = "result-card";

  if (!url) {
    resultDiv.innerHTML = `
      <div class="verdict-header">\u2753 Please paste a link first.</div>
    `;
    resultDiv.classList.add("unknown");
    copyBtn.style.display = "none";
    shareBtn.style.display = "none";
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
`Checked: ${url}
${verdictEmoji} ${verdictText}
Reason: ${reason}`;

  resultDiv.dataset.summary = summary;

  // Show action buttons
  copyBtn.style.display = "inline-block";
  shareBtn.style.display = "inline-block";
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
