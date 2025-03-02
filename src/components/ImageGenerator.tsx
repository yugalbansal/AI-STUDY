import React, { useState, useEffect } from 'react';
import { generateImageUrl, inferModelFromPrompt, generateRandomSeed, enhancePrompt } from '../lib/imageGeneration';
import { Wand2, Download, RefreshCw, Copy } from 'lucide-react';

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

  const generateImage = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setError(null);
    setIsGenerating(true);
    
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
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">AI Image Generator</h2>
      
      <div className="mb-4">
        <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-1">
          Describe the image you want to generate
        </label>
        <textarea
          id="prompt"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="A serene mountain landscape with a lake at sunset..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isGenerating}
        />
      </div>
      
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={generateImage}
          disabled={isGenerating || !prompt.trim()}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5 mr-2" />
              Generate Image
            </>
          )}
        </button>
        
        <button
          onClick={regenerateWithNewSeed}
          disabled={isGenerating || !prompt.trim()}
          className="flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          New Variation
        </button>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {imageUrl && (
        <div className="space-y-4">
          <div className="relative border border-gray-200 rounded-lg overflow-hidden">
            <img 
              src={imageUrl} 
              alt={prompt} 
              className="w-full h-auto object-contain"
              style={{ maxHeight: '512px' }}
            />
            
            <div className="absolute bottom-0 right-0 p-2 flex space-x-2">
              <button
                onClick={downloadImage}
                className="p-2 bg-white bg-opacity-75 rounded-full hover:bg-opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                title="Download image"
              >
                <Download className="w-5 h-5 text-gray-700" />
              </button>
              
              <button
                onClick={copyImageUrl}
                className="p-2 bg-white bg-opacity-75 rounded-full hover:bg-opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                title={copied ? "Copied!" : "Copy image URL"}
              >
                <Copy className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>
          
          <div className="text-sm text-gray-500">
            <p>Seed: {seed}</p>
          </div>
        </div>
      )}
    </div>
  );
}