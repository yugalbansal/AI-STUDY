import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export async function getChatResponse(prompt: string, context: string) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
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

    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: systemPrompt,
        },
        {
          role: 'model',
          parts: 'I understand and will follow these rules.',
        },
      ],
    });

    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    
    return relevantContext
      ? `[From Documents]\n\n${response.text()}`
      : `[AI Response]\n\n${response.text()}`;
  } catch (error: any) {
    console.error('Error getting chat response:', error);
    return `I apologize, but I encountered an error: ${error.message}. Please try again.`;
  }
}