/**
 * Image generation utilities using Pollinations.ai
 */

export interface ImageGenerationOptions {
  width?: number;
  height?: number;
  seed?: number;
  model?: 'flux' | 'flux-realism' | 'any-dark' | 'flux-anime' | 'flux-3d' | 'turbo';
  nologo?: boolean;
}

const DEFAULT_OPTIONS: ImageGenerationOptions = {
  width: 1024,
  height: 1024,
  model: 'flux',
  nologo: true
};

/**
 * Generate an image URL from Pollinations.ai based on a prompt
 */
export function generateImageUrl(prompt: string, options: ImageGenerationOptions = {}): string {
  // Encode the prompt for URL
  const encodedPrompt = encodeURIComponent(prompt);
  
  // Merge default options with provided options
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  
  // Build the query parameters
  const queryParams = Object.entries(mergedOptions)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  
  // Return the full URL
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?${queryParams}`;
}

/**
 * Infer the best model based on prompt content
 */
export function inferModelFromPrompt(prompt: string): ImageGenerationOptions['model'] {
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes('anime') || lowerPrompt.includes('manga') || lowerPrompt.includes('cartoon')) {
    return 'flux-anime';
  }
  
  if (lowerPrompt.includes('3d') || lowerPrompt.includes('render') || lowerPrompt.includes('cgi')) {
    return 'flux-3d';
  }
  
  if (lowerPrompt.includes('realistic') || lowerPrompt.includes('photo') || lowerPrompt.includes('photograph')) {
    return 'flux-realism';
  }
  
  if (lowerPrompt.includes('dark') || lowerPrompt.includes('horror') || lowerPrompt.includes('night')) {
    return 'any-dark';
  }
  
  return 'flux';
}

/**
 * Generate a random seed for reproducible results
 */
export function generateRandomSeed(): number {
  return Math.floor(Math.random() * 1000000);
}

/**
 * Enhance a prompt with more details if it's too short
 */
export function enhancePrompt(prompt: string): string {
  if (prompt.split(' ').length >= 10) {
    return prompt;
  }
  
  // Add some generic enhancements based on the prompt
  const enhancements = [
    'high quality',
    'detailed',
    'professional',
    'vibrant colors',
    'sharp focus',
    'beautiful composition',
    '4k resolution',
    'trending on artstation',
    'masterpiece'
  ];
  
  // Select a few random enhancements
  const selectedEnhancements = enhancements
    .sort(() => 0.5 - Math.random())
    .slice(0, 3)
    .join(', ');
  
  return `${prompt}, ${selectedEnhancements}`;
}