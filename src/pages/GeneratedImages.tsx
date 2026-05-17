import { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Copy, ExternalLink, Image as ImageIcon, Loader2, MessageSquare, RefreshCw, Sparkles } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';
import type { GeneratedImageRecord } from '@/lib/generatedImages';

export default function GeneratedImages() {
  const { supabase, userId, loading: authLoading } = useClerkAuth();
  const [images, setImages] = useState<GeneratedImageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchImages = useCallback(async () => {
    if (!supabase || !userId) return;

    setIsLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('generated_images')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      setError('Unable to load generated images. Please run the generated_images SQL migration if this is the first setup.');
      setImages([]);
    } else {
      setImages((data || []) as GeneratedImageRecord[]);
    }

    setIsLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    if (!authLoading) {
      void fetchImages();
    }
  }, [authLoading, fetchImages]);

  const copyPrompt = async (image: GeneratedImageRecord) => {
    try {
      await navigator.clipboard.writeText(image.prompt);
      setCopiedId(image.id);
      window.setTimeout(() => setCopiedId(null), 1500);
    } catch {
      setError('Could not copy prompt.');
    }
  };

  return (
    <>
      <Helmet>
        <title>Generated Images - Vector Mind AI</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
        <Navbar />

        <main className="mx-auto w-full max-w-7xl px-4 pb-12 pt-28 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-gray-300">
                <Sparkles className="h-4 w-4 text-blue-500" />
                Image history
              </div>
              <h1 className="text-2xl font-semibold tracking-normal text-gray-950 dark:text-white sm:text-3xl">
                Generated Images
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
                Images created from chat with <span className="font-medium">/image</span> and from the image generator page.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void fetchImages()}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-200 dark:hover:bg-zinc-800"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <Link
                to="/images"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                <ImageIcon className="h-4 w-4" />
                Create
              </Link>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : images.length === 0 ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white px-6 text-center dark:border-zinc-700 dark:bg-zinc-900">
              <ImageIcon className="mb-4 h-12 w-12 text-gray-300 dark:text-zinc-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">No images yet</h2>
              <p className="mt-2 max-w-md text-sm text-gray-600 dark:text-gray-400">
                Use <span className="font-medium">/image</span> in chat or create one from the image page, and it will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {images.map((image) => (
                <article
                  key={image.id}
                  className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <a href={image.image_url} target="_blank" rel="noopener noreferrer" className="block bg-gray-100 dark:bg-zinc-950">
                    <img
                      src={image.image_url}
                      alt={image.prompt}
                      loading="lazy"
                      decoding="async"
                      className="aspect-square w-full object-cover"
                    />
                  </a>

                  <div className="space-y-3 p-3">
                    <p className="line-clamp-2 min-h-10 text-sm font-medium text-gray-900 dark:text-white">
                      {image.prompt}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      {image.model && <span>{image.model}</span>}
                      {image.seed !== null && <span>Seed {image.seed}</span>}
                      <span>{new Date(image.created_at).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void copyPrompt(image)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-gray-300 px-2 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:border-zinc-700 dark:text-gray-200 dark:hover:bg-zinc-800"
                      >
                        <Copy className="h-4 w-4" />
                        {copiedId === image.id ? 'Copied' : 'Prompt'}
                      </button>
                      {image.chat_id ? (
                        <Link
                          to={`/chat?chat=${image.chat_id}`}
                          className="inline-flex items-center justify-center rounded-md border border-gray-300 p-2 text-gray-700 transition-colors hover:bg-gray-100 dark:border-zinc-700 dark:text-gray-200 dark:hover:bg-zinc-800"
                          title="Open chat"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Link>
                      ) : null}
                      <a
                        href={image.image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-md border border-gray-300 p-2 text-gray-700 transition-colors hover:bg-gray-100 dark:border-zinc-700 dark:text-gray-200 dark:hover:bg-zinc-800"
                        title="Open image"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
