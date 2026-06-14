// Content Script - Scrapes LeetCode problem description

function extractProblem() {
  try {
    // Try multiple selectors for robustness
    const titleSelectors = [
      '[data-cy="question-title"]',
      'h1.text-2xl',
      'h1.font-semibold',
      'h1'
    ];
    
    let title = "";
    for (const selector of titleSelectors) {
      const el = document.querySelector(selector);
      if (el && el.innerText.trim()) {
        title = el.innerText.trim();
        break;
      }
    }

    // Reliable fallback from document title and URL slug.
    if (!title) {
      const docTitle = (document.title || "").replace(/\s*-\s*LeetCode.*$/i, "").trim();
      if (docTitle) {
        title = docTitle;
      }
    }
    if (!title) {
      const match = window.location.pathname.match(/\/problems\/([^/]+)\//);
      if (match?.[1]) {
        title = match[1]
          .split("-")
          .filter(Boolean)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      }
    }

    // Extract description
    const descSelectors = [
      '[data-track-load="description_content"]',
      '.question-content__JfgR',
      '[class*="description"]',
      '[class*="content"]'
    ];
    
    let description = "";
    for (const selector of descSelectors) {
      const el = document.querySelector(selector);
      if (el && el.innerText.trim().length > 50) {
        description = el.innerText.trim();
        break;
      }
    }

    // Fallback to body text if specific selectors fail
    if (!description) {
      description = document.body.innerText.substring(0, 5000);
    }

    if (!title || !description || description.length < 50) {
      return {
        error: "Could not extract full problem content. Make sure the Problem Description tab is visible.",
        title: title || "",
        description: description || "",
        url: window.location.href,
        timestamp: new Date().toISOString()
      };
    }

    // Extract examples
    const exampleSelectors = [
      '[class*="example"]',
      'pre',
      'code'
    ];
    
    const examples = [];
    exampleSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (el.innerText.includes('Input:') || el.innerText.includes('Output:')) {
          examples.push(el.innerText.trim());
        }
      });
    });

    const problemData = {
      title,
      description,
      examples: examples.slice(0, 3),
      url: window.location.href,
      timestamp: new Date().toISOString()
    };

    // Store in chrome.storage for sidepanel access
    chrome.storage.local.set({ currentProblem: problemData });
    
    // Notify background script
    chrome.runtime.sendMessage({
      type: "PROBLEM_DATA",
      data: problemData
    });

    return problemData;
  } catch (error) {
    console.error("Error extracting problem:", error);
    return { error: error.message };
  }
}

function extractWithRetry(retries = 8, delayMs = 700) {
  const data = extractProblem();
  if (!data?.error) return;
  if (retries <= 0) return;
  setTimeout(() => extractWithRetry(retries - 1, delayMs), delayMs);
}

// Extract on load
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(() => extractWithRetry(), 800);
} else {
  window.addEventListener('load', () => setTimeout(() => extractWithRetry(), 800));
}

// Re-extract on URL change (for SPA navigation)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(() => extractWithRetry(), 1200);
  }
}).observe(document, { subtree: true, childList: true });

// Listen for explicit requests from side panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'REQUEST_PROBLEM_DATA') {
    const data = extractProblem();
    sendResponse(data);
  }
  return true;
});