/* ═══════════════════════════════════════════════════════════════
   TweetSense — app.js
   Handles: tab navigation, single analysis, batch/CSV analysis,
            chart rendering, drag-and-drop upload, API health check.
═══════════════════════════════════════════════════════════════ */

// ── CONFIG ─────────────────────────────────────────────────────
// Change this to your deployed Render/Railway URL in production.
// For local dev: http://localhost:5000
const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:5000"
  : "https://twitter-sentiment-analysis-hanv.onrender.com";   // ← update after deploying

// ── STATE ──────────────────────────────────────────────────────
let totalAnalysed = 0;
let totalPositive = 0;
let totalNegative = 0;
let doughnutChart = null;
let barChart      = null;

// ── DOM REFS ───────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const tweetInput       = $("tweetInput");
const charCount        = $("charCount");
const analyseBtn       = $("analyseBtn");
const clearBtn         = $("clearBtn");
const resultPlaceholder = $("resultPlaceholder");
const resultContent    = $("resultContent");
const statusDot        = $("statusDot");
const statusLabel      = $("statusLabel");
const loadingOverlay   = $("loadingOverlay");
const batchInput       = $("batchInput");
const batchBtn         = $("batchBtn");
const csvFile          = $("csvFile");
const uploadZone       = $("uploadZone");
const batchResults     = $("batchResults");
const batchCharts      = $("batchCharts");

// ═══════════════════════════════════════════════════════════════
// 1. TAB NAVIGATION
// ═══════════════════════════════════════════════════════════════
document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    const tab = link.dataset.tab;
    document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
    document.querySelectorAll(".tab-pane").forEach(p => p.classList.add("hidden"));
    link.classList.add("active");
    $(`tab-${tab}`).classList.remove("hidden");
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. API HEALTH CHECK
// ═══════════════════════════════════════════════════════════════
async function checkApiHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      statusDot.className   = "status-dot online";
      statusLabel.textContent = "API online";
    } else { throw new Error("Non-200"); }
  } catch {
    statusDot.className   = "status-dot offline";
    statusLabel.textContent = "API offline";
  }
}
checkApiHealth();
setInterval(checkApiHealth, 30_000);

// ═══════════════════════════════════════════════════════════════
// 3. CHAR COUNTER
// ═══════════════════════════════════════════════════════════════
tweetInput.addEventListener("input", () => {
  charCount.textContent = tweetInput.value.length;
});

// ═══════════════════════════════════════════════════════════════
// 4. EXAMPLE CHIPS
// ═══════════════════════════════════════════════════════════════
document.querySelectorAll(".chip").forEach(chip => {
  chip.addEventListener("click", () => {
    tweetInput.value = chip.dataset.tweet;
    charCount.textContent = chip.dataset.tweet.length;
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. CLEAR BUTTON
// ═══════════════════════════════════════════════════════════════
clearBtn.addEventListener("click", () => {
  tweetInput.value = "";
  charCount.textContent = "0";
  resultPlaceholder.classList.remove("hidden");
  resultContent.classList.add("hidden");
});

// ═══════════════════════════════════════════════════════════════
// 6. SINGLE TWEET ANALYSIS
// ═══════════════════════════════════════════════════════════════
analyseBtn.addEventListener("click", async () => {
  const text = tweetInput.value.trim();
  if (!text) {
    shake(tweetInput);
    return;
  }
  showLoading(true);
  try {
    const data = await callApi("/analyze", { text });
    renderSingleResult(data);
    updateHeroStats(data.label);
  } catch (err) {
    showError(err.message);
  } finally {
    showLoading(false);
  }
});

// Allow Enter+Ctrl to submit
tweetInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && e.ctrlKey) analyseBtn.click();
});

// ── Render single result ──────────────────────────────────────
function renderSingleResult(data) {
  const { label, emoji, scores, confidence, keywords } = data;

  // Switch visibility
  resultPlaceholder.classList.add("hidden");
  resultContent.classList.remove("hidden");

  // Header
  $("resultEmoji").textContent = emoji;
  const labelEl = $("resultLabel");
  labelEl.textContent  = label;
  labelEl.className    = `result-label ${label}`;
  $("resultConfidence").textContent = `Confidence: ${confidence}%`;

  // Score bars (animate after tiny delay so CSS transition fires)
  requestAnimationFrame(() => {
    setBar("barPos", "valPos", scores.positive);
    setBar("barNeg", "valNeg", scores.negative);
    setBar("barNeu", "valNeu", scores.neutral);
  });

  // Compound needle — map -1…+1 to 0%…100%
  const pct = ((scores.compound + 1) / 2) * 100;
  $("compoundNeedle").style.left = `${pct}%`;
  $("compoundVal").textContent   = scores.compound.toFixed(3);

  // Keywords
  const kwChips = $("kwChips");
  kwChips.innerHTML = "";
  if (keywords && keywords.length) {
    keywords.forEach(kw => {
      const span = document.createElement("span");
      span.className   = "kw-chip";
      span.textContent = kw;
      kwChips.appendChild(span);
    });
    $("keywordsRow").classList.remove("hidden");
  } else {
    $("keywordsRow").classList.add("hidden");
  }
}

function setBar(barId, valId, score) {
  const pct = Math.round(score * 100);
  $(barId).style.width   = `${pct}%`;
  $(valId).textContent   = `${pct}%`;
}

// ═══════════════════════════════════════════════════════════════
// 7. BATCH ANALYSIS — textarea
// ═══════════════════════════════════════════════════════════════
batchBtn.addEventListener("click", async () => {
  const lines = batchInput.value.split("\n").map(l => l.trim()).filter(Boolean);
  if (!lines.length) { shake(batchInput); return; }
  showLoading(true);
  try {
    const data = await callApi("/analyze-batch", { tweets: lines });
    renderBatchResults(data.results, data.statistics);
  } catch (err) {
    showError(err.message);
  } finally {
    showLoading(false);
  }
});

// ═══════════════════════════════════════════════════════════════
// 8. CSV UPLOAD
// ═══════════════════════════════════════════════════════════════
uploadZone.addEventListener("click", () => csvFile.click());
csvFile.addEventListener("change", () => handleFileUpload(csvFile.files[0]));

uploadZone.addEventListener("dragover", e => {
  e.preventDefault();
  uploadZone.classList.add("dragover");
});
uploadZone.addEventListener("dragleave", () => uploadZone.classList.remove("dragover"));
uploadZone.addEventListener("drop", e => {
  e.preventDefault();
  uploadZone.classList.remove("dragover");
  const file = e.dataTransfer.files[0];
  if (file) handleFileUpload(file);
});

async function handleFileUpload(file) {
  if (!file || !file.name.endsWith(".csv")) {
    showError("Please upload a valid .csv file.");
    return;
  }
  showLoading(true);
  try {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/analyze-csv`, { method: "POST", body: formData });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "CSV analysis failed.");
    }
    const data = await res.json();
    renderBatchResults(data.results, data.statistics);
  } catch (err) {
    showError(err.message);
  } finally {
    showLoading(false);
  }
}

// ═══════════════════════════════════════════════════════════════
// 9. RENDER BATCH RESULTS
// ═══════════════════════════════════════════════════════════════
function renderBatchResults(results, stats) {
  batchResults.classList.add("hidden");
  batchCharts.classList.remove("hidden");

  // Summary cards
  const summaryCards = $("summaryCards");
  summaryCards.innerHTML = `
    <div class="summary-card">
      <div class="s-num pos">${stats.positive_pct}%</div>
      <div class="s-label">😊 Positive (${stats.positive})</div>
    </div>
    <div class="summary-card">
      <div class="s-num neg">${stats.negative_pct}%</div>
      <div class="s-label">😠 Negative (${stats.negative})</div>
    </div>
    <div class="summary-card">
      <div class="s-num neu">${stats.neutral_pct}%</div>
      <div class="s-label">😐 Neutral (${stats.neutral})</div>
    </div>
  `;

  // Charts
  drawDoughnutChart(stats);
  drawBarChart(results);

  // Table rows
  const tbody = $("resultsBody");
  tbody.innerHTML = "";
  results.forEach((r, i) => {
    const tr = document.createElement("tr");
    const preview = (r.text || "").slice(0, 55) + (r.text.length > 55 ? "…" : "");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td title="${escHtml(r.text)}">${escHtml(preview)}</td>
      <td><span class="badge ${r.label}">${r.emoji} ${r.label}</span></td>
      <td style="font-family:var(--font-mono)">${r.scores.compound.toFixed(3)}</td>
      <td style="font-family:var(--font-mono)">${r.confidence}%</td>
    `;
    tbody.appendChild(tr);
  });

  // Update hero stats
  totalAnalysed += stats.total;
  totalPositive += stats.positive;
  totalNegative += stats.negative;
  refreshHeroStats();
}

// ── Charts ────────────────────────────────────────────────────
function drawDoughnutChart(stats) {
  if (doughnutChart) doughnutChart.destroy();
  const ctx = $("doughnutChart").getContext("2d");
  doughnutChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Positive", "Negative", "Neutral"],
      datasets: [{
        data: [stats.positive, stats.negative, stats.neutral],
        backgroundColor: ["#22c55e", "#ef4444", "#f59e0b"],
        borderColor: "#181b24",
        borderWidth: 3,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: { color: "#6b7089", font: { family: "Space Mono", size: 10 }, boxWidth: 12 }
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.parsed} tweets`
          }
        }
      },
      cutout: "65%"
    }
  });
}

function drawBarChart(results) {
  if (barChart) barChart.destroy();
  // Bucket compound scores into 10 bins from -1 to +1
  const bins  = Array(10).fill(0);
  const labels = ["-1.0","-0.8","-0.6","-0.4","-0.2","0.0","0.2","0.4","0.6","0.8"];
  results.forEach(r => {
    const idx = Math.min(9, Math.floor((r.scores.compound + 1) / 0.2));
    bins[idx]++;
  });
  const colors = bins.map((_, i) => {
    if (i < 4)  return "#ef4444";
    if (i === 4 || i === 5) return "#f59e0b";
    return "#22c55e";
  });
  const ctx = $("barChart").getContext("2d");
  barChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Tweet count",
        data: bins,
        backgroundColor: colors,
        borderRadius: 4,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { title: ctx => `Score ≈ ${ctx[0].label}` } }
      },
      scales: {
        x: { ticks: { color: "#6b7089", font: { family: "Space Mono", size: 9 } }, grid: { color: "#2a2d3a" } },
        y: { ticks: { color: "#6b7089", font: { family: "Space Mono", size: 9 } }, grid: { color: "#2a2d3a" }, beginAtZero: true }
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// 10. HERO STAT COUNTERS
// ═══════════════════════════════════════════════════════════════
function updateHeroStats(label) {
  totalAnalysed++;
  if (label === "positive") totalPositive++;
  if (label === "negative") totalNegative++;
  refreshHeroStats();
}

function refreshHeroStats() {
  animateCount($("statTotal"), totalAnalysed);
  $("statPos").textContent = totalAnalysed
    ? `${Math.round((totalPositive / totalAnalysed) * 100)}%` : "—";
  $("statNeg").textContent = totalAnalysed
    ? `${Math.round((totalNegative / totalAnalysed) * 100)}%` : "—";
}

function animateCount(el, target) {
  const start = parseInt(el.textContent) || 0;
  const dur   = 500;
  const t0    = performance.now();
  const step  = ts => {
    const progress = Math.min((ts - t0) / dur, 1);
    el.textContent = Math.round(start + (target - start) * easeOut(progress));
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

// ═══════════════════════════════════════════════════════════════
// 11. UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════
async function callApi(endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `API error ${res.status}`);
  return data;
}

function showLoading(show) {
  loadingOverlay.classList.toggle("hidden", !show);
}

function showError(msg) {
  // Simple toast — you could replace with a fancier notification
  const toast = document.createElement("div");
  toast.style.cssText = `
    position:fixed;bottom:2rem;right:2rem;z-index:9999;
    background:#ef4444;color:#fff;padding:.8rem 1.2rem;
    border-radius:8px;font-family:var(--font-mono);font-size:.75rem;
    box-shadow:0 4px 20px rgba(0,0,0,.5);animation:fadeIn .3s ease;
  `;
  toast.textContent = `⚠️  ${msg}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4500);
}

function shake(el) {
  el.style.animation = "none";
  el.getBoundingClientRect();
  el.style.animation = "shake .35s ease";
  el.addEventListener("animationend", () => el.style.animation = "", { once: true });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Add shake keyframes dynamically ──────────────────────────
const styleTag = document.createElement("style");
styleTag.textContent = `
@keyframes shake {
  0%,100%{transform:translateX(0)}
  20%{transform:translateX(-6px)}
  40%{transform:translateX(6px)}
  60%{transform:translateX(-4px)}
  80%{transform:translateX(4px)}
}`;
document.head.appendChild(styleTag);
