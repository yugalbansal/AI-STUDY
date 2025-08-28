import React, { useState, useEffect } from 'react';
import { generateImageUrl, inferModelFromPrompt, generateRandomSeed, enhancePrompt } from '../lib/imageGeneration';
import { Wand2, Download, RefreshCw, Copy, Loader2 } from 'lucide-react';

interface ImageGeneratorProps {
  initialPrompt?: string;
}

export default function ImageGenerator({ initialPrompt = '' }: ImageGeneratorProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [seed, setSeed] = useState<number>(generateRandomSeed());
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  const generateImage = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setError(null);
    setIsGenerating(true);
    setImageLoading(false); // Reset before generating
    
    try {
      // Enhance the prompt if it's too short
      const enhancedPrompt = enhancePrompt(prompt);
      
      // Infer the best model based on the prompt
      const model = inferModelFromPrompt(enhancedPrompt);
      
      // Generate the image URL
      const url = generateImageUrl(enhancedPrompt, {
        seed,
        model,
        width: 1024,
        height: 1024,
        nologo: true
      });
      
      // Simulate a delay to make it feel like it's generating
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setImageUrl(url);
      setImageLoading(true); // Start loading when URL is set
    } catch (err) {
      console.error('Error generating image:', err);
      setError('Failed to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateWithNewSeed = () => {
    setSeed(generateRandomSeed());
  };

  const downloadImage = async () => {
    if (!imageUrl) return;
    
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-image-${seed}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading image:', err);
      setError('Failed to download image. Please try again.');
    }
  };

  const copyImageUrl = () => {
    if (!imageUrl) return;
    
    navigator.clipboard.writeText(imageUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Error copying URL:', err);
        setError('Failed to copy URL. Please try again.');
      });
  };

  useEffect(() => {
    if (seed && prompt) {
      generateImage();
    }
  }, [seed]);

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
      <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">AI Image Generator</h2>
      
      <div className="mb-4">
        <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-1">
          Describe the image you want to generate
        </label>
        <textarea
          id="prompt"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base touch-manipulation"
          placeholder="A serene mountain landscape with a lake at sunset..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isGenerating}
        />
      </div>
      
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4 sm:mb-6">
        <button
          onClick={generateImage}
          disabled={isGenerating || !prompt.trim()}
          className="flex items-center justify-center px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px] text-sm sm:text-base"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 sm:w-5 h-4 sm:h-5 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="w-4 sm:w-5 h-4 sm:h-5 mr-2" />
              Generate Image
            </>
          )}
        </button>
        
        <button
          onClick={regenerateWithNewSeed}
          disabled={isGenerating || !prompt.trim()}
          className="flex items-center justify-center px-4 py-2.5 sm:py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 active:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px] text-sm sm:text-base"
        >
          <RefreshCw className="w-4 sm:w-5 h-4 sm:h-5 mr-2" />
          New Variation
        </button>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}
      
      {imageUrl && (
        <div className="space-y-3 sm:space-y-4">
          <div className="relative border border-gray-200 rounded-lg overflow-hidden min-h-[200px] sm:min-h-[256px] flex items-center justify-center bg-gray-50">
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
                <Loader2 className="w-8 sm:w-10 h-8 sm:h-10 text-blue-600 animate-spin" />
              </div>
            )}
            <img 
              src={imageUrl} 
              alt={prompt} 
              className={`w-full h-auto object-contain transition-opacity duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
              style={{ maxHeight: window.innerWidth < 640 ? '300px' : '512px' }}
              onLoad={() => setImageLoading(false)}
              onError={() => setImageLoading(false)}
            />
            
            <div className="absolute bottom-2 right-2 flex space-x-2">
              <button
                onClick={downloadImage}
                className="p-2 sm:p-2.5 bg-white bg-opacity-75 rounded-full hover:bg-opacity-100 active:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Download image"
              >
                <Download className="w-4 sm:w-5 h-4 sm:h-5 text-gray-700" />
              </button>
              
              <button
                onClick={copyImageUrl}
                className="p-2 sm:p-2.5 bg-white bg-opacity-75 rounded-full hover:bg-opacity-100 active:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                title={copied ? "Copied!" : "Copy image URL"}
              >
                <Copy className="w-4 sm:w-5 h-4 sm:h-5 text-gray-700" />
              </button>
            </div>
          </div>
          
          <div className="text-xs sm:text-sm text-gray-500 bg-gray-50 p-2 rounded">
            <p>Seed: <span className="font-mono">{seed}</span></p>
          </div>
        </div>
      )}
    </div>
  );
}