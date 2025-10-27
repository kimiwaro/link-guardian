function checkLink() {
  const url = document.getElementById('urlInput').value.trim();
  const resultDiv = document.getElementById('result');
  const copyBtn = document.getElementById('copyBtn');
  const shareBtn = document.getElementById('shareBtn');

  // Reset classes
  resultDiv.className = "result-card";

  if (!url) {
    resultDiv.innerText = "❓ Please paste a link first.";
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
    verdictEmoji = "⚠️";
    verdictText = "Likely Fake";
    reason = "Suspicious keywords or uncommon domain.";
    resultDiv.classList.add("fake");
  } else {
    verdictEmoji = "✅";
    verdictText = "Likely Genuine";
    reason = "No obvious suspicious patterns.";
    resultDiv.classList.add("safe");
  }

  // Show verdict in the UI
  resultDiv.innerText = `${verdictEmoji} ${verdictText}\nReason: ${reason}`;

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
