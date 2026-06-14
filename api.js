// api.js - Gemini API-key mode with dynamic model discovery
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const PREFERRED_MODEL_ORDER = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-1.0-pro"
];
let cachedWorkingModel = null;

function generatePrompt(problemData) {
  const trimmedDescription = (problemData.description || "").slice(0, 3000);
  return `You are an expert coding interview coach. Analyze this LeetCode problem and provide solutions in Python, Java, and C++.

Problem Title: ${problemData.title}
Problem Description: ${trimmedDescription}

CRITICAL REQUIREMENTS:
1. Return ONLY valid JSON - no markdown, no extra text before or after.
2. Code must be COMPLETE and READY TO PASTE into LeetCode without any modification.
3. Include ONLY the class Solution and method - NO main functions, NO test cases, NO extra output.
4. All three languages MUST be provided: python, java, cpp.
5. Each solution must be the OPTIMAL approach.

JSON Structure (copy this exactly, fill in your content):
{
  "companies": ["List actual companies here based on your data"],
  "problem_analysis": {
    "explanation": "Brief explanation here",
    "example": "Example walkthrough here"
  },
  "intuition": {
    "thinking": "How to approach this problem",
    "hint": "Key insight",
    "pattern": "Algorithm pattern"
  },
  "approach": {
    "brute": {
      "steps": "Steps for brute force",
      "time": "O(n^2)",
      "space": "O(1)"
    },
    "better": {
      "steps": "Steps for better approach",
      "time": "O(n log n)",
      "space": "O(n)"
    },
    "optimal": {
      "steps": "Steps for optimal approach",
      "time": "O(n)",
      "space": "O(n)"
    }
  },
  "dry_run": "Step by step execution trace",
  "code": {
    "python": "class Solution:\\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\\n        # solution here",
    "java": "class Solution {\\n    public int[] twoSum(int[] nums, int target) {\\n        // solution here\\n    }\\n}",
    "cpp": "class Solution {\\npublic:\\n    vector<int> twoSum(vector<int>& nums, int target) {\\n        // solution here\\n    }\\n};"
  }
}`;
}

// FIXED: Added robust parseGeminiResponse function
function parseGeminiResponse(data) {
  try {
    // Check for valid response structure
    if (!data) {
      throw new Error("Empty response from API");
    }
    
    if (data.error) {
      throw new Error(data.error.message || "API returned an error");
    }
    
    if (!data.candidates || !Array.isArray(data.candidates) || data.candidates.length === 0) {
      throw new Error("No candidates in response");
    }
    
    const candidate = data.candidates[0];
    
    if (candidate.finishReason === "SAFETY") {
      throw new Error("Response blocked by safety settings");
    }
    
    if (!candidate.content || !candidate.content.parts || !Array.isArray(candidate.content.parts)) {
      throw new Error("Invalid content structure in response");
    }
    
    const text = candidate.content.parts[0].text;
    
    if (!text || text.trim().length === 0) {
      throw new Error("Empty text in response");
    }
    
    // Try multiple strategies to extract JSON
    let jsonText = text.trim();
    
    // Strategy 1: Extract from markdown code blocks
    const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      jsonText = codeBlockMatch[1].trim();
    }
    
    // Strategy 2: Find JSON between first { and last }
    const startIdx = jsonText.indexOf('{');
    const endIdx = jsonText.lastIndexOf('}');
    
    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
      throw new Error("Could not find valid JSON boundaries in response");
    }
    
    jsonText = jsonText.substring(startIdx, endIdx + 1);
    
    // Clean up common JSON issues
    jsonText = jsonText
      .replace(/,\s*}/g, '}')  // Remove trailing commas before }
      .replace(/,\s*]/g, ']')  // Remove trailing commas before ]
      .replace(/\n/g, '\\n')   // Escape newlines in strings (but be careful)
      .replace(/\r/g, '');     // Remove carriage returns
    
    // Try to parse JSON
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (parseError) {
      // If parsing fails, try with unescaped newlines in code strings
      try {
        parsed = JSON.parse(text.substring(startIdx, endIdx + 1));
      } catch (e2) {
        throw new Error(`JSON parse error: ${parseError.message}`);
      }
    }
    
    // Validate structure
    if (!parsed || typeof parsed !== 'object') {
      throw new Error("Parsed data is not an object");
    }
    
    // Ensure code object exists
    if (!parsed.code || typeof parsed.code !== 'object') {
      parsed.code = {};
    }
    
    // Ensure all three languages exist with valid strings
    const requiredLangs = ['python', 'java', 'cpp'];
    for (const lang of requiredLangs) {
      if (!parsed.code[lang] || typeof parsed.code[lang] !== 'string' || parsed.code[lang].trim() === '') {
        parsed.code[lang] = `// ${lang.toUpperCase()} solution not available - please try analyzing again`;
      }
    }
    
    // Ensure other required fields exist
    if (!parsed.problem_analysis) parsed.problem_analysis = {};
    if (!parsed.intuition) parsed.intuition = {};
    if (!parsed.approach) parsed.approach = { brute: {}, better: {}, optimal: {} };
    if (!parsed.companies) parsed.companies = [];
    if (!parsed.dry_run) parsed.dry_run = "Dry run not available";
    
    return parsed;
    
  } catch (error) {
    console.error('[API] parseGeminiResponse error:', error);
    return { 
      error: true, 
      message: error.message,
      partial: true,
      code: {
        python: "// Error: " + error.message,
        java: "// Error: " + error.message,
        cpp: "// Error: " + error.message
      }
    };
  }
}

async function fetchAnalysis(problemData, apiKey) {
  // FIXED: Increased maxOutputTokens to 8192 for 3 full solutions
  const body = JSON.stringify({
    contents: [{ parts: [{ text: generatePrompt(problemData) }] }],
    generationConfig: {
      temperature: 0.1,  // Lower temperature for more consistent output
      maxOutputTokens: 8192,  // Increased from 2048 to handle 3 code solutions
      topP: 0.95,
      topK: 40
    }
  });

  let lastError = "Unknown Gemini API error";
  let sawQuotaError = false;
  let retryAfterSeconds = null;
  
  // Try cached model first
  if (cachedWorkingModel) {
    try {
      console.log(`[API] Trying cached model: ${cachedWorkingModel}`);
      const result = await callGenerateContent(cachedWorkingModel, apiKey, body);
      if (!result.error) {
        return result;
      }
    } catch (error) {
      console.log(`[API] Cached model failed: ${error.message}`);
      lastError = error.message || lastError;
      if (isQuotaError(lastError)) {
        sawQuotaError = true;
        retryAfterSeconds = extractRetrySeconds(lastError) ?? retryAfterSeconds;
      }
      cachedWorkingModel = null;
    }
  }

  // Get available models
  let modelNames;
  try {
    modelNames = await getAvailableModelNames(apiKey);
    console.log(`[API] Available models: ${modelNames.join(', ')}`);
  } catch (error) {
    throw new Error(`Failed to list models: ${error.message}`);
  }
  
  if (!modelNames.length) {
    throw new Error("No Gemini models with generateContent are available for this API key.");
  }

  // Try each model
  for (const modelName of modelNames) {
    try {
      console.log(`[API] Trying model: ${modelName}`);
      const parsed = await callGenerateContent(modelName, apiKey, body);
      
      // Check if parsing was successful
      if (parsed.error && parsed.partial) {
        console.warn(`[API] Model ${modelName} returned partial data`);
        // Continue to next model if we got an error
        continue;
      }
      
      cachedWorkingModel = modelName;
      console.log(`[API] Success with model: ${modelName}`);
      return parsed;
    } catch (error) {
      console.log(`[API] Model ${modelName} failed: ${error.message}`);
      lastError = error.message || lastError;
      
      if (isQuotaError(lastError)) {
        sawQuotaError = true;
        retryAfterSeconds = extractRetrySeconds(lastError) ?? retryAfterSeconds;
        continue; // Try next model
      }
      
      // Don't retry on auth errors
      if (/API key|permission|billing|403|401|invalid/i.test(lastError)) {
        break;
      }
    }
  }

  if (sawQuotaError) {
    const retryHint = retryAfterSeconds ? ` Retry after ~${Math.ceil(retryAfterSeconds)}s.` : "";
    throw new Error(
      "Gemini API quota exceeded for this key/project. Enable billing or wait for quota reset, then try again." + retryHint
    );
  }

  throw new Error(lastError || "All models failed to generate a valid response");
}

async function callGenerateContent(modelName, apiKey, body) {
  const url = `${GEMINI_BASE}/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;
  
  console.log(`[API] Calling ${modelName}...`);
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || `API Error: ${response.status}`;
    throw new Error(message);
  }

  const data = await response.json();
  const parsed = parseGeminiResponse(data);
  
  if (parsed?.error && !parsed.partial) {
    throw new Error(parsed.message || "Failed to parse Gemini response");
  }
  
  return parsed;
}

async function getAvailableModelNames(apiKey) {
  const url = `${GEMINI_BASE}/models?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, { method: "GET" });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || `Model listing failed: ${response.status}`;
    throw new Error(message);
  }

  const data = await response.json();
  const names = (data.models || [])
    .filter((m) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes("generateContent"))
    .map((m) => (m.name || "").replace(/^models\//, ""))
    .filter(Boolean);

  const unique = [...new Set(names)];
  unique.sort((a, b) => modelRank(a) - modelRank(b));
  
  console.log(`[API] Found ${unique.length} available models`);
  return unique;
}

function modelRank(name) {
  const idx = PREFERRED_MODEL_ORDER.indexOf(name);
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
}

function isQuotaError(message) {
  return /quota|rate limit|exceeded your current quota|429|Resource has been exhausted/i.test(message || "");
}

function extractRetrySeconds(message) {
  const m = String(message || "").match(/retry in\s+([0-9.]+)s/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { fetchAnalysis, parseGeminiResponse };
}