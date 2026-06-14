🧠 LeetCode Logic Assistant

Think. Don't Copy. Learn the Logic Behind Every Problem.

A modern AI-powered Chrome Extension that helps developers understand how to solve LeetCode problems instead of simply revealing solutions. The extension provides structured guidance through problem analysis, intuition, approaches, dry runs, and code explanations while encouraging active learning with a unique No Code Mode.

🚀 Features
📖 Problem Analysis
Simple English explanation of the problem
Beginner-friendly breakdown
Small example for quick understanding
Displays companies that have previously asked the question
💡 Intuition
Learn how to think about the problem
Pattern identification (Sliding Window, DP, Graph, Two Pointers, etc.)
Strategic hints without revealing the solution
Common mistakes to avoid
🛠️ Approach
Brute Force approach
Better approach
Optimal approach
Step-by-step algorithms
Time & Space Complexity analysis
🧪 Dry Run
Visual step-by-step execution
Helps understand the algorithm flow
Makes complex logic easier to grasp
💻 Code Section
Multi-language support:
Python
Java
C++
C
Includes complexity analysis
Hidden by default to encourage learning
🔒 No Code Mode
Enabled by default
Prevents access to code solutions
Encourages users to think independently
Can be disabled manually when needed
🤖 Gemini AI Integration
Powered by Google Gemini API
Generates structured learning content
Produces problem-specific explanations and insights
🏗️ Tech Stack
Frontend: HTML, CSS, JavaScript
Extension Platform: Chrome Extension Manifest V3
AI Model: Google Gemini API
Storage: Chrome Storage API
Architecture: Content Scripts + Background Service Worker + Side Panel
📂 Project Structure
leetcode-logic-assistant/
│
├── manifest.json
├── content.js
├── background.js
│
├── sidepanel/
│   ├── panel.html
│   ├── panel.css
│   ├── panel.js
│
├── utils/
│   ├── api.js
│   ├── parser.js
│
└── README.md
⚙️ How It Works
LeetCode Problem
        ↓
Content Script Extracts Problem
        ↓
Background Script
        ↓
Gemini API Analysis
        ↓
Structured JSON Response
        ↓
Modern Side Panel UI
🎯 Why This Project?

Most coding assistants immediately reveal solutions, reducing learning effectiveness.

LeetCode Logic Assistant follows a different philosophy:

"We don't solve problems for you. We train you to solve them yourself."

By guiding users through structured reasoning and hiding code behind No Code Mode, the extension promotes deeper understanding and stronger problem-solving skills.

🔧 Installation
Clone the repository
git clone https://github.com/yourusername/leetcode-logic-assistant.git
Open Chrome and navigate to:
chrome://extensions
Enable Developer Mode
Click Load Unpacked
Select the project folder containing manifest.json
Add your Gemini API key
Open any LeetCode problem and start learning 🚀
🌟 Future Enhancements
Progress tracking
Personalized learning insights
Interview preparation mode
Difficulty prediction
Topic-wise performance analytics
Export notes to PDF
👨‍💻 Author 

Ayaj Khan

Passionate about AI, Software Engineering, and building tools that help developers learn more effectively.
