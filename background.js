// Background Service Worker - Handles API calls and side panel
importScripts("api.js", "parser.js");

// Listen for messages from content script and side panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_ANALYSIS") {
    handleAnalysisWithApiKey(request.data)
      .then(sendResponse)
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (request.type === "SET_API_KEY") {
    chrome.storage.local.set({ geminiApiKey: request.apiKey }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.type === "PROBLEM_DATA") {
    // Store for sidepanel access
    chrome.storage.local.set({ 
      currentProblem: request.data,
      lastUpdated: Date.now()
    });
    sendResponse({ status: "stored" });
    return true;
  }
});

async function handleAnalysisWithApiKey(problemData) {
  const { geminiApiKey } = await chrome.storage.local.get(["geminiApiKey"]);
  if (!geminiApiKey) {
    throw new Error("API key not set. Please enter your Gemini API key.");
  }
  return fetchAnalysis(problemData, geminiApiKey);
}

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url && tab.url.includes('leetcode.com/problems/')) {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  } else if (tab.windowId) {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  }
});