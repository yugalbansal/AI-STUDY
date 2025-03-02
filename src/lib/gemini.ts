import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the API with a fallback for missing key
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

export async function getChatResponse(prompt: string, context: string) {
  try {
    // Check if API key is available
    if (!API_KEY) {
      return "Error: Gemini API key is missing. Please add VITE_GEMINI_API_KEY to your .env file.";
    }
    
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    // Enhanced context matching with link support
    let relevantContext = '';
    if (context) {
      const contextSections = context.split('\n\n');
      const relevantSections = contextSections.filter(section => {
        const keywords = prompt.toLowerCase().split(' ').filter(word => word.length > 3);
        const isRelevant = keywords.some(keyword => section.toLowerCase().includes(keyword));
        const isLink = section.startsWith('Link:');
        return isRelevant || isLink;
      });
      relevantContext = relevantSections.join('\n\n');
    }

    const systemPrompt = `You are an AI tutor. Follow these rules strictly:
    1. If code is needed, wrap it in markdown code blocks with the appropriate language
    2. Never use LaTeX or mathematical symbols like $x$ or $$
    3. Write mathematical expressions in plain text (e.g., "x squared" instead of "x²")
    4. Keep responses concise and well-structured
    5. If relevant links are provided in the context, mention them in your response
    6. If the answer is in the following context, use it. Otherwise, use your knowledge:
    
    ${relevantContext || 'No context available'}`;

    try {
      const chat = model.startChat({
        history: [
          {
            role: 'user',
            parts: [{ text: systemPrompt }],
          },
          {
            role: 'model',
            parts: [{ text: 'I understand and will follow these rules.' }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 1000,
        },
      });

      const result = await chat.sendMessage([{ text: prompt }]);
      const response = await result.response;
      const text = response.text();
      
      return relevantContext
        ? `[From Documents]\n\n${text}`
        : `[AI Response]\n\n${text}`;
    } catch (modelError: any) {
      console.error('Model error:', modelError);
      return `I apologize, but I encountered an error with the AI model: ${modelError.message || 'Unknown error'}. Please try again.`;
    }
  } catch (error: any) {
    console.error('Error getting chat response:', error);
    return `I apologize, but I encountered an error: ${error.message || 'Unknown error'}. Please try again.`;
  }
}