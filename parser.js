// Response Parser

function parseGeminiResponse(data) {
  try {
    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
      throw new Error("Invalid response structure from Gemini");
    }

    const text = data.candidates[0].content.parts[0].text;
    
    // Clean up the response - remove markdown code blocks if present
    let cleanedText = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    // Try to find JSON object if there's surrounding text
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedText = jsonMatch[0];
    }

    const parsed = JSON.parse(cleanedText);
    
    // Validate required fields
    const requiredFields = ['companies', 'problem_analysis', 'intuition', 'approach', 'dry_run', 'code'];
    for (const field of requiredFields) {
      if (!(field in parsed)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    return parsed;
  } catch (error) {
    console.error("Parsing error:", error);
    console.log("Raw text:", data?.candidates?.[0]?.content?.parts?.[0]?.text);
    
    // Return fallback structure if parsing fails
    return {
      error: true,
      message: "Failed to parse AI response. Please try again.",
      raw: data?.candidates?.[0]?.content?.parts?.[0]?.text || "No content"
    };
  }
}