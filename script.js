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

  // Simple placeholder logic
  if (url.includes("secure") || url.includes("login") || url.includes(".xyz")) {
    verdictText = "⚠️ Likely Fake\nReason: Suspicious keywords or uncommon domain.";
    resultDiv.style.background = "#f8d7da";
  } else {
    verdictText = "✅ Likely Genuine\nReason: No obvious suspicious patterns.";
    resultDiv.style.background = "#d4edda";
  }

  resultDiv.innerText = verdictText;
  copyBtn.style.display = "inline-block"; // show button
}

function copyResult() {
  const resultText = document.getElementById('result').innerText;
  navigator.clipboard.writeText(resultText).then(() => {
    alert("Result copied! You can now paste it into WhatsApp.");
  });
}
