function checkLink() {
  const url = document.getElementById('urlInput').value.trim();
  const resultDiv = document.getElementById('result');
  const copyBtn = document.getElementById('copyBtn');

  if (!url) {
    resultDiv.innerText = "❓ Please paste a link first.";
    resultDiv.style.background = "#fff3cd";
    copyBtn.style.display = "none";
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
    resultDiv.style.background = "#f8d7da";
  } else {
    verdictEmoji = "✅";
    verdictText = "Likely Genuine";
    reason = "No obvious suspicious patterns.";
    resultDiv.style.background = "#d4edda";
  }

  // Show verdict in the UI
  resultDiv.innerText = `${verdictEmoji} ${verdictText}\nReason: ${reason}`;

  // Store full summary for copy
  resultDiv.dataset.summary = 
`Checked: ${url}
${verdictEmoji} ${verdictText}
Reason: ${reason}`;

  copyBtn.style.display = "inline-block"; // show button
}

function copyResult() {
  const resultDiv = document.getElementById('result');
  const summary = resultDiv.dataset.summary || resultDiv.innerText;

  navigator.clipboard.writeText(summary).then(() => {
    alert("Result copied! Paste it into WhatsApp to share.");
  });
}
