import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  Cpu,
  Box,
  Film,
  History,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Monitor,
  Palette,
  Pause,
  Play,
  RotateCw,
  Search,
  Sparkles,
  Sun,
  User,
  Wand2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export type GenerationMode = 'image' | 'video' | 'avatar';

interface GenerationSettings {
  style: string;
  backgroundColor: string;
  lighting: string;
  pose: string;
  aspectRatio: string;
  aiModel: string;
  resolution: string;
  prompt: string;
  negativePrompt: string;
  seed?: number;
  steps?: number;
}

interface HistoryItem {
  id: string;
  type: GenerationMode;
  url: string;
  prompt: string;
  timestamp: Date;
}

const placeholderPrompts: Record<GenerationMode, string> = {
  image: 'Professional portrait with neutral background, studio lighting',
  video: 'Cinematic video of a subject walking through a neon city at night',
  avatar: 'Detailed 3D avatar with expressive features and modern styling',
};

const loadingTexts: Record<GenerationMode, string[]> = {
  image: ['Creating your masterpiece...', 'Finding the perfect colors...', 'Adding the final touches...'],
  video: ['Generating video frames...', 'Applying motion effects...', 'Rendering your video...'],
  avatar: ['Building 3D mesh...', 'Applying textures...', 'Finalizing your avatar...'],
};

const aiModels: Record<GenerationMode, { value: string; label: string }[]> = {
  image: [
    { value: 'stable-diffusion-xl', label: 'Stable Diffusion XL' },
    { value: 'midjourney-v5', label: 'Midjourney v5' },
    { value: 'dalle-3', label: 'DALL·E 3' },
    { value: 'imagen', label: 'Imagen' },
  ],
  video: [
    { value: 'gen-2', label: 'Gen-2' },
    { value: 'runway-gen-2', label: 'Runway Gen-2' },
    { value: 'pika-labs', label: 'Pika Labs' },
    { value: 'sora', label: 'Sora' },
  ],
  avatar: [
    { value: 'dreamshaper-3d', label: 'DreamShaper 3D' },
    { value: '3d-diffusion', label: '3D Diffusion' },
    { value: 'meshy', label: 'Meshy' },
    { value: 'luma', label: 'Luma AI' },
  ],
};

const resolutions: Record<GenerationMode, { value: string; label: string }[]> = {
  image: [
    { value: '512x512', label: '512×512' },
    { value: '768x768', label: '768×768' },
    { value: '1024x1024', label: '1024×1024' },
    { value: '1536x1536', label: '1536×1536' },
  ],
  video: [
    { value: '512x512', label: '512×512' },
    { value: '768x768', label: '768×768' },
    { value: '1024x576', label: '1024×576 (16:9)' },
    { value: '1280x720', label: '1280×720 (HD)' },
  ],
  avatar: [
    { value: '512x512', label: '512×512' },
    { value: '768x768', label: '768×768' },
    { value: '1024x1024', label: '1024×1024' },
    { value: '2048x2048', label: '2048×2048' },
  ],
};

const defaultHistory: HistoryItem[] = [
  {
    id: '1',
    type: 'image',
    url: 'https://ferf1mheo22r9ira.public.blob.vercel-storage.com/profile-mjss82WnWBRO86MHHGxvJ2TVZuyrDv.jpeg',
    prompt: 'Portrait of a woman with orange background',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
  },
  {
    id: '2',
    type: 'image',
    url: 'https://ferf1mheo22r9ira.public.blob.vercel-storage.com/profile-mjss82WnWBRO86MHHGxvJ2TVZuyrDv.jpeg',
    prompt: 'Professional headshot with blue background',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
  },
];

function formatRelativeTime(date: Date) {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

export function AIMultiModalGeneration() {
  const [mode, setMode] = useState<GenerationMode>('image');
  const [showForm, setShowForm] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [promptSuggestions, setPromptSuggestions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [generatedItems, setGeneratedItems] = useState<HistoryItem[]>(defaultHistory);

  const [settings, setSettings] = useState<GenerationSettings>({
    style: 'artistic',
    backgroundColor: 'studio',
    lighting: 'studio',
    pose: 'profile',
    aspectRatio: '4:5',
    aiModel: 'stable-diffusion-xl',
    resolution: '1024x1024',
    prompt: '',
    negativePrompt: 'blurry, low quality, distorted features',
    seed: 0,
    steps: 30,
  });

  useEffect(() => {
    const suggestions: Record<GenerationMode, string[]> = {
      image: [
        'Professional headshot with neutral background',
        'Artistic portrait with dramatic lighting',
        'Casual portrait in natural outdoor setting',
      ],
      video: [
        'Person walking in urban environment, cinematic lighting',
        'Close-up of face with changing expressions',
        'Rotating view of subject in studio setting',
      ],
      avatar: [
        'Realistic 3D avatar with professional attire',
        'Stylized cartoon character with expressive features',
        'Detailed 3D bust with photorealistic textures',
      ],
    };

    setPromptSuggestions(suggestions[mode]);
  }, [mode]);

  useEffect(() => {
    if (!isLoading) {
      setProgress(0);
      return;
    }

    const increment = mode === 'image' ? 1.5 : mode === 'video' ? 0.8 : 0.5;
    const interval = window.setInterval(() => {
      setProgress((previous) => {
        if (previous >= 100) {
          window.clearInterval(interval);
          return 100;
        }
        return previous + increment;
      });
    }, 30);

    return () => window.clearInterval(interval);
  }, [isLoading, mode]);

  useEffect(() => {
    if (!isLoading) return;

    const interval = window.setInterval(() => {
      setCurrentTextIndex((previous) => (previous + 1) % loadingTexts[mode].length);
    }, 1500);

    return () => window.clearInterval(interval);
  }, [isLoading, mode]);

  const filteredItems = useMemo(
    () =>
      generatedItems.filter((item) => item.prompt.toLowerCase().includes(searchQuery.trim().toLowerCase())),
    [generatedItems, searchQuery],
  );

  const handlePromptChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSettings({ ...settings, prompt: event.target.value });
  };

  const handleNegativePromptChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSettings({ ...settings, negativePrompt: event.target.value });
  };

  const handleSeedChange = (value: number[]) => {
    setSettings({ ...settings, seed: value[0] });
  };

  const handleStepsChange = (value: number[]) => {
    setSettings({ ...settings, steps: value[0] });
  };

  const applyPromptSuggestion = (suggestion: string) => {
    setSettings({ ...settings, prompt: suggestion });
  };

  const togglePlay = () => setIsPlaying((previous) => !previous);
  const toggleRotate = () => setIsRotating((previous) => !previous);

  const handleModeChange = (value: string) => {
    const nextMode = value as GenerationMode;
    setMode(nextMode);
    setShowForm(true);
    setShowHistory(false);
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowForm(false);
    setIsLoading(true);
    setError(null);

    try {
      const loadingDelay = mode === 'image' ? 3000 : mode === 'video' ? 5000 : 7000;
      await new Promise((resolve) => window.setTimeout(resolve, loadingDelay));

      const newItem: HistoryItem = {
        id: Date.now().toString(),
        type: mode,
        url: 'https://cdn.pixabay.com/photo/2023/08/03/09/57/ai-generated-8166705_1280.png',
        prompt: settings.prompt || 'AI generated content',
        timestamp: new Date(),
      };

      setGeneratedItems((previous) => [newItem, ...previous]);
      setShowForm(false);
    } catch (generationError) {
      console.error(generationError);
      setError(`Failed to generate ${mode}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToSettings = () => {
    setShowForm(true);
    setShowHistory(false);
    setError(null);
  };

  const handleViewHistory = () => {
    setShowForm(false);
    setShowHistory(true);
  };

  const handleSelectHistoryItem = (id: string) => {
    const item = generatedItems.find((historyItem) => historyItem.id === id);
    if (!item) return;

    setMode(item.type);
    setSettings((previous) => ({ ...previous, prompt: item.prompt }));
    setShowHistory(false);
    setShowForm(false);
  };

  const renderHeader = () => (
    <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">AI Multi-Modal Generation</h3>
        <p className="text-xs text-gray-500">Create portrait images, looping videos, or expressive avatars.</p>
      </div>
      <button
        type="button"
        onClick={handleViewHistory}
        className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
        aria-label="View history"
      >
        <History className="h-4 w-4" />
      </button>
    </div>
  );

  const renderError = () =>
    error ? (
      <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
        <AlertCircle className="h-4 w-4" />
        <p>{error}</p>
      </div>
    ) : null;

  const renderSettings = () => (
    <div className="space-y-3 rounded-xl bg-gray-50 p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Cpu className="h-4 w-4" />
          <span>AI Model</span>
        </div>
  <Select value={settings.aiModel} onValueChange={(value: string) => setSettings({ ...settings, aiModel: value })}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            {aiModels[mode].map((model) => (
              <SelectItem key={model.value} value={model.value}>
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Monitor className="h-4 w-4" />
          <span>Resolution</span>
        </div>
        <Select
          value={settings.resolution}
          onValueChange={(value: string) => setSettings({ ...settings, resolution: value })}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Select size" />
          </SelectTrigger>
          <SelectContent>
            {resolutions[mode].map((resolution) => (
              <SelectItem key={resolution.value} value={resolution.value}>
                {resolution.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Palette className="h-4 w-4" />
          <span>Style</span>
        </div>
  <Select value={settings.style} onValueChange={(value: string) => setSettings({ ...settings, style: value })}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Select style" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="professional">Professional</SelectItem>
            <SelectItem value="artistic">Artistic</SelectItem>
            <SelectItem value="casual">Casual</SelectItem>
            <SelectItem value="vintage">Vintage</SelectItem>
            {mode === 'avatar' && <SelectItem value="cartoon">Cartoon</SelectItem>}
            {mode === 'avatar' && <SelectItem value="anime">Anime</SelectItem>}
            {mode === 'video' && <SelectItem value="cinematic">Cinematic</SelectItem>}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <ImageIcon className="h-4 w-4" />
          <span>Background</span>
        </div>
        <Select
          value={settings.backgroundColor}
          onValueChange={(value: string) => setSettings({ ...settings, backgroundColor: value })}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Select background" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="studio">Studio</SelectItem>
            <SelectItem value="gradient">Gradient</SelectItem>
            <SelectItem value="solid">Solid</SelectItem>
            <SelectItem value="transparent">Transparent</SelectItem>
            {mode !== 'avatar' && <SelectItem value="outdoor">Outdoor</SelectItem>}
            {mode !== 'avatar' && <SelectItem value="office">Office</SelectItem>}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Sun className="h-4 w-4" />
          <span>Lighting</span>
        </div>
  <Select value={settings.lighting} onValueChange={(value: string) => setSettings({ ...settings, lighting: value })}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Select lighting" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="soft">Soft</SelectItem>
            <SelectItem value="dramatic">Dramatic</SelectItem>
            <SelectItem value="natural">Natural</SelectItem>
            <SelectItem value="studio">Studio</SelectItem>
            {mode === 'video' && <SelectItem value="cinematic">Cinematic</SelectItem>}
            {mode === 'video' && <SelectItem value="golden-hour">Golden Hour</SelectItem>}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="6" width="18" height="12" rx="2" ry="2" />
            <path d="M7 6v12" />
            <path d="M17 6v12" />
          </svg>
          <span>Aspect Ratio</span>
        </div>
        <Select
          value={settings.aspectRatio}
          onValueChange={(value: string) => setSettings({ ...settings, aspectRatio: value })}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Select ratio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1:1">1:1 Square</SelectItem>
            <SelectItem value="4:5">4:5 Portrait</SelectItem>
            <SelectItem value="3:4">3:4 Portrait</SelectItem>
            <SelectItem value="16:9">16:9 Landscape</SelectItem>
            {mode === 'video' && <SelectItem value="9:16">9:16 Vertical</SelectItem>}
          </SelectContent>
        </Select>
      </div>

      {mode !== 'video' && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="h-4 w-4" />
            <span>Pose</span>
          </div>
          <Select value={settings.pose} onValueChange={(value: string) => setSettings({ ...settings, pose: value })}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select pose" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="headshot">Headshot</SelectItem>
              <SelectItem value="half-body">Half body</SelectItem>
              <SelectItem value="full-body">Full body</SelectItem>
              <SelectItem value="profile">Profile</SelectItem>
              {mode === 'avatar' && <SelectItem value="bust">Bust</SelectItem>}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  const renderPromptForm = () => (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col justify-between gap-4 p-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MessageCircle className="h-4 w-4" />
              <span>Prompt</span>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-gray-500">
                  <Wand2 className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72">
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500">Suggestions</h4>
                  <div className="space-y-1">
                    {promptSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => applyPromptSuggestion(suggestion)}
                        className="w-full rounded-md p-2 text-left text-xs text-gray-600 transition-colors hover:bg-gray-100"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <Textarea
            value={settings.prompt}
            onChange={handlePromptChange}
            placeholder={placeholderPrompts[mode]}
            className="min-h-[90px]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Switch id="advanced-mode" checked={advancedMode} onCheckedChange={setAdvancedMode} />
          <Label htmlFor="advanced-mode" className="text-xs text-gray-600">
            Advanced mode
          </Label>
        </div>

        {advancedMode && (
          <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
            <div className="space-y-2">
              <Label className="text-xs text-gray-600">Negative prompt</Label>
              <Textarea
                value={settings.negativePrompt}
                onChange={handleNegativePromptChange}
                placeholder="Elements to avoid in generation"
                className="min-h-[70px]"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Seed</span>
                <span className="font-medium text-gray-800">{settings.seed}</span>
              </div>
              <Slider value={[settings.seed ?? 0]} max={1_000_000} step={1} onValueChange={handleSeedChange} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Steps</span>
                <span className="font-medium text-gray-800">{settings.steps}</span>
              </div>
              <Slider value={[settings.steps ?? 30]} min={10} max={150} step={1} onValueChange={handleStepsChange} />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {renderSettings()}
        <Button type="submit" className="w-full bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white">
          <Sparkles className="h-4 w-4" />
          Generate {mode === 'image' ? 'Image' : mode === 'video' ? 'Video' : 'Avatar'}
        </Button>
      </div>
    </form>
  );

  const renderGallery = () => {
    const items = generatedItems.slice(0, 3);
    if (!items.length) return null;

    return (
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-500">Recent generations</h4>
        <div className="grid grid-cols-4 gap-2">
          {items.map((item) => (
            <div key={item.id} className="group relative aspect-square overflow-hidden rounded-lg">
              <img
                src={item.url || '/placeholder.svg'}
                alt={item.prompt}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="flex items-center gap-1 text-[10px] text-white">
                  {item.type === 'image' && <ImageIcon className="h-3 w-3" />}
                  {item.type === 'video' && <Film className="h-3 w-3" />}
                  {item.type === 'avatar' && <Box className="h-3 w-3" />}
                  <span>{item.timestamp.toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPreview = () => (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex items-center justify-center rounded-xl bg-gray-50 p-4">
        {isLoading ? (
          <Card className="w-full max-w-sm border-0 bg-transparent shadow-none">
            <CardContent className="flex flex-col items-center gap-4 p-6">
              <div className="relative h-16 w-16">
                <Loader2 className="h-full w-full animate-spin text-fuchsia-500" />
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-transparent to-fuchsia-500/20" />
              </div>
              <div className="space-y-1 text-center">
                <p className="text-sm font-medium text-gray-700">{loadingTexts[mode][currentTextIndex]}</p>
                <p className="text-xs text-gray-500">
                  {mode === 'image'
                    ? 'This usually takes 10–15 seconds'
                    : mode === 'video'
                      ? 'This usually takes 20–30 seconds'
                      : 'This usually takes 30–45 seconds'}
                </p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full bg-gradient-to-r from-fuchsia-500 to-violet-500 transition-all duration-300 ease-linear"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex w-full flex-col items-center gap-3">
            <div className="relative w-full overflow-hidden rounded-xl">
              <img
                src={generatedItems[0]?.url || '/placeholder.svg'}
                alt={`Generated ${mode}`}
                className={cn('h-full w-full object-cover', isRotating && 'animate-[spin_6s_linear_infinite]')}
              />
              {mode !== 'image' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-colors hover:bg-white/30"
                  >
                    {isPlaying ? <Pause className="h-6 w-6 text-white" /> : <Play className="ml-1 h-6 w-6 text-white" />}
                  </button>
                </div>
              )}
              {mode === 'avatar' && (
                <button
                  type="button"
                  onClick={toggleRotate}
                  className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-gray-700 shadow transition-colors hover:bg-white"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {!isLoading && (
        <div className="space-y-4">
          <div className="grid gap-2 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
            <div className="flex justify-between">
              <span className="text-gray-500">Quality</span>
              <span className="font-medium text-gray-800">{settings.resolution}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Model</span>
              <span className="font-medium text-gray-800">{settings.aiModel}</span>
            </div>
            {mode === 'video' && (
              <div className="flex justify-between">
                <span className="text-gray-500">Duration</span>
                <span className="font-medium text-gray-800">00:07</span>
              </div>
            )}
          </div>

          {renderGallery()}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="w-full border-gray-200 text-gray-700 hover:bg-gray-100"
              onClick={handleBackToSettings}
            >
              Back to settings
            </Button>
            <Button type="button" className="w-full bg-gray-900 text-white hover:bg-gray-800">
              Download
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const renderHistory = () => (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleBackToSettings}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Generation history</h3>
          <p className="text-xs text-gray-500">Reuse prompts and revisit previous outputs.</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by prompt..."
          className="pl-10"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-gray-500">
            <Clock className="h-8 w-8 text-gray-400" />
            <p>No generations found</p>
            {searchQuery && <p className="text-xs text-gray-400">Try a different search term</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectHistoryItem(item.id)}
                className="flex w-full items-center gap-3 rounded-lg border border-transparent p-2 text-left transition-colors hover:border-gray-200 hover:bg-gray-50"
              >
                <img
                  src={item.url || '/placeholder.svg'}
                  alt={item.prompt}
                  className="h-12 w-12 flex-shrink-0 rounded-md object-cover"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-gray-800">{item.prompt}</p>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-500">
                    <span>{formatRelativeTime(item.timestamp)}</span>
                    <span>•</span>
                    <span className="capitalize">{item.type}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl">
      {renderHeader()}

      <Tabs value={mode} onValueChange={handleModeChange} className="w-full border-b border-gray-200 px-6 pb-4 pt-3">
        <TabsList className="grid w-full grid-cols-3 bg-gray-100">
          <TabsTrigger value="image" className="gap-2 text-sm">
            <ImageIcon className="h-4 w-4" />
            Image
          </TabsTrigger>
          <TabsTrigger value="video" className="gap-2 text-sm">
            <Film className="h-4 w-4" />
            Video
          </TabsTrigger>
          <TabsTrigger value="avatar" className="gap-2 text-sm">
            <Box className="h-4 w-4" />
            3D Avatar
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid min-h-[640px] gap-0 lg:grid-cols-[1.25fr_1fr]">
        {renderError()}
        {showHistory ? renderHistory() : showForm ? renderPromptForm() : renderPreview()}
      </div>
    </div>
  );
}
