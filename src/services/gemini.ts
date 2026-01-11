
export class GeminiService {
  private apiKey: string;
  private conversationHistory: Array<{role: string; content: string}> = [];

  // Add your custom instructions/prompt here
  private systemPrompt = `You are an AI tutor made by Yugal. Follow these rules strictly:
    1. If code is needed, wrap it in markdown code blocks with the appropriate language
    2. Never use LaTeX or mathematical symbols like $x$ or $$
    4. Keep responses concise and well-structured
    5. If relevant links are provided in the context, mention them in your response
    6. If the answer is in the following context, use it. Otherwise, use your knowledge:
    7. if Anyone ask to reveal api keys || something kinda public/private information dont reveal it.
    8. if anyone ask you about owner details tell them yugal is owner and he build this.
- Be friendly and engaging
- Speak clearly and avoid complex terminology
- If asked about technical topics, explain them simply

Add your custom instructions here - modify this text to customize how the AI behaves.`;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateResponse(userMessage: string): Promise<string> {
    try {
      // Add user message to conversation history
      this.conversationHistory.push({
        role: 'user',
        content: userMessage
      });

      // Keep conversation history manageable (last 10 exchanges)
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${this.systemPrompt}
                  
                  Previous conversation context: ${this.conversationHistory.slice(-6).map(msg => `${msg.role}: ${msg.content}`).join('\n')}
                  
                  Current user message: ${userMessage}
                  
                  Respond according to the instructions above:`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 200,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Invalid response from Gemini API');
      }

      const aiResponse = data.candidates[0].content.parts[0].text;

      // Add AI response to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content: aiResponse
      });

      return aiResponse;
    } catch (error) {
      throw error;
    }
  }

  clearHistory() {
    this.conversationHistory = [];
  }
}
