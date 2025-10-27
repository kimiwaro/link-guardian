function checkLink() {
  const url = document.getElementById('urlInput').value.trim();
  const resultDiv = document.getElementById('result');

  if (!url) {
    resultDiv.innerText = "❓ Please paste a link first.";
    resultDiv.style.background = "#fff3cd";
    return;
  }

  // Simple placeholder logic
  if (url.includes("secure") || url.includes("login") || url.includes(".xyz")) {
    resultDiv.innerText = "⚠️ Likely Fake\nReason: Suspicious keywords or uncommon domain.";
    resultDiv.style.background = "#f8d7da";
  } else {
    resultDiv.innerText = "✅ Likely Genuine\nReason: No obvious suspicious patterns.";
    resultDiv.style.background = "#d4edda";
  }
}
