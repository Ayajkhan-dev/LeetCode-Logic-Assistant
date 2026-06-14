// Side Panel Logic - Gemini API key mode

let currentProblem = null;
let currentAnalysis = null;
let noCodeMode = true;
let activeTab = "analysis";
let selectedLanguage = "python";

const elements = {
  apiKeySection: document.getElementById("apiKeySection"),
  noCodeSection: document.getElementById("noCodeSection"),
  noCodeToggle: document.getElementById("noCodeToggle"),
  problemInfo: document.getElementById("problemInfo"),
  problemTitle: document.getElementById("problemTitle"),
  loadingState: document.getElementById("loadingState"),
  tabGrid: document.getElementById("tabGrid"),
  tabButtons: document.querySelectorAll(".tab-btn[data-tab]"),
  tabContents: document.querySelectorAll(".tab-content"),
  codeTab: document.getElementById("codeTab"),
  codeBlocked: document.getElementById("codeBlocked"),
  codeContainer: document.getElementById("codeContainer"),
  unlockBtn: document.getElementById("unlockBtn"),
  langButtons: document.querySelectorAll(".lang-btn"),
  codeDisplay: document.getElementById("codeDisplay"),
  copyBtn: document.getElementById("copyBtn"),
  refreshBtn: document.getElementById("refreshBtn"),
  analyzeBtn: document.getElementById("analyzeBtn"),
  analyzeSection: document.getElementById("analyzeSection"),
  contentArea: document.getElementById("contentArea"),
  overlay: document.getElementById("overlay"),
  errorToast: document.getElementById("errorToast"),
  errorMessage: document.getElementById("errorMessage"),
  closeErrorBtn: document.getElementById("closeErrorBtn"),
  statusIndicator: document.getElementById("statusIndicator")
};

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  initializeUiVisibility();
  initializeEventListeners();
  await checkApiKeyState();
  await loadStoredData();
  await checkForProblem();
});

function initializeUiVisibility() {
  elements.apiKeySection.style.display = "none";
  elements.noCodeSection.style.display = "none";
  elements.problemInfo.style.display = "none";
  elements.tabGrid.style.display = "none";
  elements.contentArea.style.display = "none";
  elements.analyzeSection.style.display = "none";
}

function initializeEventListeners() {
  const saveKeyBtn = document.getElementById("saveKeyBtn");
  const apiKeyInput = document.getElementById("apiKeyInput");
  saveKeyBtn?.addEventListener("click", async () => {
    const key = (apiKeyInput?.value || "").trim();
    if (!key || !key.startsWith("AIza")) {
      showError("Enter a valid Gemini API key (starts with AIza).");
      return;
    }
    await chrome.runtime.sendMessage({ type: "SET_API_KEY", apiKey: key });
    showMainInterface();
    showSuccess("API key saved.");
  });

  elements.noCodeToggle.addEventListener("change", (e) => {
    noCodeMode = e.target.checked;
    updateCodeTabState();
    saveSettings();
  });

  elements.tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      if (tab) switchTab(tab);
    });
  });

  elements.unlockBtn.addEventListener("click", () => {
    elements.noCodeToggle.checked = false;
    noCodeMode = false;
    updateCodeTabState();
    saveSettings();
  });

  elements.langButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      selectedLanguage = btn.dataset.lang;
      updateLanguageButtons();
      displayCode();
    });
  });

  elements.copyBtn.addEventListener("click", copyCodeToClipboard);
  elements.refreshBtn.addEventListener("click", refreshAnalysis);
  elements.analyzeBtn.addEventListener("click", requestAnalysis);
  elements.closeErrorBtn?.addEventListener("click", () => {
    elements.errorToast.style.display = "none";
  });
}

async function checkApiKeyState() {
  const { geminiApiKey } = await chrome.storage.local.get(["geminiApiKey"]);
  if (geminiApiKey && geminiApiKey.startsWith("AIza")) {
    showMainInterface();
  } else {
    showApiKeyInput();
  }
}

function showApiKeyInput() {
  elements.apiKeySection.style.display = "block";
  elements.noCodeSection.style.display = "none";
  elements.problemInfo.style.display = "none";
  elements.tabGrid.style.display = "none";
  elements.contentArea.style.display = "none";
  elements.analyzeSection.style.display = "none";
}

function showMainInterface() {
  elements.apiKeySection.style.display = "none";
  elements.noCodeSection.style.display = "block";
  elements.problemInfo.style.display = "block";
  elements.tabGrid.style.display = "grid";
  elements.contentArea.style.display = "block";
  elements.analyzeSection.style.display = "block";
  
  // Ensure no-code mode UI is updated when showing interface
  elements.noCodeToggle.checked = noCodeMode;
  updateCodeTabState();
}

async function loadStoredData() {
  const result = await chrome.storage.local.get(["noCodeMode", "currentAnalysis", "currentProblem"]);
  
  // Default to TRUE (no code mode ON) if not previously set
  if (result.noCodeMode !== undefined) {
    noCodeMode = result.noCodeMode;
  } else {
    noCodeMode = true; // Default: no code mode enabled
    // Save this default to storage so it persists
    await chrome.storage.local.set({ noCodeMode: true });
  }
  
  // Update UI to match state
  elements.noCodeToggle.checked = noCodeMode;
  updateCodeTabState();
  
  if (result.currentProblem) {
    loadProblem(result.currentProblem);
  }
  if (result.currentAnalysis) {
    renderAnalysis(result.currentAnalysis);
  }
}

async function checkForProblem() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url?.includes("leetcode.com/problems/")) {
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: "REQUEST_PROBLEM_DATA" });
      if (response) loadProblem(response);
    } catch (e) {
      loadProblem({ error: "Open a LeetCode problem page, then reload that tab once." });
    }
  } else {
    loadProblem({ error: "You are not on a LeetCode problem page." });
  }
}

function loadProblem(problem) {
  if (!problem) return;
  
  if (problem.error) {
    elements.problemTitle.textContent = "Error: " + problem.error;
    elements.problemTitle.style.color = "#e57373";
    return;
  }
  
  currentProblem = problem;
  elements.loadingState.style.display = "none";
  elements.problemTitle.style.display = "block";
  elements.problemTitle.textContent = problem.title || "Unknown Problem";
  elements.problemTitle.style.color = "#ffffff";
}

async function requestAnalysis() {
  if (!currentProblem) {
    showError("No problem loaded. Please refresh.");
    return;
  }

  if (currentProblem.error) {
    showError(currentProblem.error);
    return;
  }

  showLoading(true);
  updateStatus("analyzing");

  try {
    const analysis = await chrome.runtime.sendMessage({
      type: "GET_ANALYSIS",
      data: currentProblem
    });
    if (analysis?.error) {
      throw new Error(analysis.error);
    }
    currentAnalysis = analysis;
    await chrome.storage.local.set({ currentAnalysis: analysis });
    renderAnalysis(analysis);
    updateStatus("ready");
    showSuccess("Analysis complete!");
  } catch (error) {
    console.error("Analysis failed:", error);
    showError(error.message);
    updateStatus("error");
  } finally {
    showLoading(false);
  }
}

function renderAnalysis(data) {
  if (data.error) {
    showError(data.message || 'Failed to load analysis');
    return;
  }

  // Companies
  const companiesGrid = document.getElementById('companiesGrid');
  if (data.companies && data.companies.length > 0) {
    companiesGrid.innerHTML = data.companies.map(c => 
      `<span class="chip">${escapeHtml(c)}</span>`
    ).join('');
  } else {
    companiesGrid.innerHTML = '<span class="placeholder-text">No company data available</span>';
  }

  // Analysis Tab
  document.getElementById("explanationText").textContent =
    data.problem_analysis?.explanation || "No explanation available";
  document.getElementById("exampleText").textContent =
    data.problem_analysis?.example || "No example walkthrough available";

  // Intuition Tab
  document.getElementById("thinkingText").textContent =
    data.intuition?.thinking || "No thinking guide available";
  document.getElementById("hintText").textContent =
    data.intuition?.hint || "No hint available";
  document.getElementById("patternText").textContent =
    data.intuition?.pattern || "No pattern identified";
  document.getElementById("mistakeText").textContent =
    data.intuition?.mistake || "No common mistakes listed";

  // Approach Tab
  renderApproach(data.approach);

  // Dry Run
  document.getElementById("dryrunText").textContent =
    data.dry_run || "No dry run available";

  // Store code data
  window.codeData = {
    python: data.code?.python || "",
    java: data.code?.java || "",
    cpp: data.code?.cpp || "",
    c: data.code?.c || ""
  };
  displayCode();
}

function renderApproach(approach) {
  if (!approach) return;

  const renderSection = (section, stepsEl, timeEl, spaceEl) => {
    if (section) {
      document.getElementById(stepsEl).textContent = section.steps || '';
      document.getElementById(timeEl).textContent = section.time || '';
      document.getElementById(spaceEl).textContent = section.space || '';
    }
  };

  renderSection(approach.brute, "bruteSteps", "bruteTime", "bruteSpace");
  renderSection(approach.better, "betterSteps", "betterTime", "betterSpace");
  renderSection(approach.optimal, "optimalSteps", "optimalTime", "optimalSpace");
}

function switchTab(tab) {
  activeTab = tab;
  
  elements.tabButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  
  elements.tabContents.forEach(content => {
    content.classList.toggle('active', content.id === `${tab}-content`);
  });

  // Handle code tab visibility
  if (tab === "code") {
    updateCodeTabState();
  }
}

function updateCodeTabState() {
  if (noCodeMode) {
    elements.codeTab.classList.add('disabled');
    elements.codeBlocked.style.display = 'flex';
    elements.codeContainer.style.display = 'none';
  } else {
    elements.codeTab.classList.remove('disabled');
    elements.codeBlocked.style.display = 'none';
    elements.codeContainer.style.display = 'flex';
  }
}

function updateLanguageButtons() {
  elements.langButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === selectedLanguage);
  });
}

function displayCode() {
  if (!window.codeData) return;
  
  const code = window.codeData?.[selectedLanguage];
  elements.codeDisplay.textContent = code || `No ${selectedLanguage} solution available`;
}

async function copyCodeToClipboard() {
  const code = window.codeData?.[selectedLanguage];
  if (!code) return;
  
  try {
    await navigator.clipboard.writeText(code);
    elements.copyBtn.textContent = "✓ Copied!";
    setTimeout(() => {
      elements.copyBtn.textContent = "📋 Copy";
    }, 2000);
  } catch (err) {
    showError("Failed to copy to clipboard");
  }
}

async function refreshAnalysis() {
  currentAnalysis = null;
  await chrome.storage.local.remove(["currentAnalysis"]);
  await requestAnalysis();
}

function showLoading(show) {
  elements.overlay.style.display = show ? "flex" : "none";
}

function showError(message) {
  elements.errorMessage.textContent = message;
  elements.errorToast.style.display = "flex";
  setTimeout(() => {
    elements.errorToast.style.display = "none";
  }, 5000);
}

function showSuccess(message) {
  // Create success toast
  const toast = document.createElement('div');
  toast.className = "error-toast";
  toast.style.background = "var(--accent-secondary)";
  toast.innerHTML = `<span>✓</span><span>${message}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function updateStatus(status) {
  const dot = elements.statusIndicator.querySelector('.status-dot');
  const text = elements.statusIndicator.querySelector('.status-text');
  
  const statusConfig = {
    ready: { color: "#81c784", text: "Ready" },
    analyzing: { color: "#4fc3f7", text: "Analyzing..." },
    error: { color: "#e57373", text: "Error" }
  };
  
  const config = statusConfig[status];
  if (config) {
    dot.style.background = config.color;
    text.textContent = config.text;
  }
}

function saveSettings() {
  chrome.storage.local.set({ noCodeMode });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Listen for problem updates from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "PROBLEM_DATA") {
    loadProblem(request.data);
    sendResponse({ status: "received" });
  }
  return true;
});