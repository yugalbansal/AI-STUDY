import { useState } from 'react';
import { AlertCircle, Loader2, Sparkles, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { generateRandomSeed } from '@/lib/imageGeneration';

export function SimplifiedAIImageGenerator() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const [settings, setSettings] = useState({
    prompt: '',
    model: 'flux',
    resolution: '1024x1024',
    style: 'realistic',
    background: 'studio',
    lighting: 'studio',
    aspectRatio: '1:1',
    pose: 'portrait',
    seed: generateRandomSeed(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings.prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setError(null);
    setIsLoading(true);
    setImageLoaded(false);

    try {
      // Build enhanced prompt
      const enhancedPrompt = buildEnhancedPrompt();
      
      // Use Pollinations API directly
      const encodedPrompt = encodeURIComponent(enhancedPrompt);
      const url = `https://image.pollinations.ai/prompt/${encodedPrompt}`;
      
      setGeneratedImage(url);
    } catch (err) {
      console.error(err);
      setError('Failed to generate image. Please try again.');
      setIsLoading(false);
    }
  };

  const buildEnhancedPrompt = () => {
    // Just return the prompt as-is, or add basic quality enhancers
    return `${settings.prompt}, high quality, detailed`;
  };

  const handleDownload = async () => {
    if (!generatedImage) return;
    
    try {
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-generated-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to download image');
    }
  };

  const regenerateWithNewSeed = async () => {
    if (!settings.prompt.trim()) return;
    
    const newSeed = generateRandomSeed();
    setSettings(prev => ({ ...prev, seed: newSeed }));
    
    setError(null);
    setIsLoading(true);
    setImageLoaded(false);

    try {
      const enhancedPrompt = buildEnhancedPrompt();
      
      // Use Pollinations API directly with a cache buster to get a new variation
      const encodedPrompt = encodeURIComponent(enhancedPrompt);
      const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${newSeed}`;
      
      setGeneratedImage(url);
    } catch (err) {
      console.error(err);
      setError('Failed to generate image. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-700 px-6 py-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">AI Image Generation</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Create stunning images from text descriptions</p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-red-100 dark:border-red-800 bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 p-6">
        {/* Prompt */}
        <div className="space-y-2">
          <Label className="text-sm text-gray-700 dark:text-gray-300">What do you want to create?</Label>
          <Textarea
            value={settings.prompt}
            onChange={(e) => setSettings({ ...settings, prompt: e.target.value })}
            placeholder="Describe the image you want to create... e.g., 'A serene mountain landscape at sunset with a lake reflection'"
            className="min-h-[100px] resize-none dark:bg-zinc-700 dark:border-zinc-600 dark:text-white dark:placeholder:text-gray-400"
          />
        </div>

        {/* Generate Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-zinc-700 hover:bg-zinc-600 dark:bg-zinc-600 dark:hover:bg-zinc-500 text-white transition-colors"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate Image
            </>
          )}
        </Button>

        {/* Generated Image Preview */}
        {generatedImage && (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 p-4">
              <img
                src={generatedImage}
                alt="Generated"
                className={cn(
                  'w-full rounded-lg object-contain transition-opacity duration-300',
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                )}
                onLoad={() => {
                  setImageLoaded(true);
                  setIsLoading(false);
                }}
                onError={() => {
                  setError('Failed to load image');
                  setIsLoading(false);
                }}
              />
              {!imageLoaded && (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-zinc-500 dark:text-zinc-400" />
                </div>
              )}
            </div>

            {imageLoaded && (
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={regenerateWithNewSeed}
                  className="flex-1"
                  disabled={isLoading}
                >
                  <Sparkles className="h-4 w-4" />
                  New Variation
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDownload}
                  className="flex-1"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
