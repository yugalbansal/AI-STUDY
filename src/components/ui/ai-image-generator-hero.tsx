import { useEffect, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type ImageCard = {
  id: string;
  src: string;
  alt: string;
  rotation: number;
};

type HeroFeature = {
  title: string;
  description: string;
};

export interface ImageCarouselHeroProps {
  title: string;
  subtitle?: string;
  description: string;
  ctaText: string;
  onCtaClick?: () => void;
  images: ImageCard[];
  features?: HeroFeature[];
}

const rotationIncrement = 0.5;
const rotationIntervalMs = 50;

export function ImageCarouselHero({
  title,
  subtitle,
  description,
  ctaText,
  onCtaClick,
  images,
  features,
}: ImageCarouselHeroProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });
  const [, setIsHovering] = useState(false);
  const [rotatingCards, setRotatingCards] = useState<number[]>(() =>
    images.length > 0 ? images.map((_, index) => index * (360 / images.length)) : [],
  );

  useEffect(() => {
    if (!images.length) {
      setRotatingCards([]);
      return;
    }

    setRotatingCards(images.map((_, index) => index * (360 / images.length)));
  }, [images]);

  useEffect(() => {
    if (!images.length) {
      return;
    }

    const interval = window.setInterval(() => {
      setRotatingCards((previous) =>
        previous.length ? previous.map((value) => (value + rotationIncrement) % 360) : previous,
      );
    }, rotationIntervalMs);

    return () => window.clearInterval(interval);
  }, [images.length]);

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    });
  };

  const featureCards: HeroFeature[] = useMemo(
    () =>
      features && features.length > 0
        ? features
        : [
            {
              title: 'Realistic Results',
              description: 'Photos that look professionally crafted.',
            },
            {
              title: 'Fast Generation',
              description: 'Turn ideas into images in seconds.',
            },
            {
              title: 'Diverse Styles',
              description: 'Explore a wide range of artistic options.',
            },
          ],
    [features],
  );

  return (
    <div className="relative w-full min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-600/10 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-purple-600/10 to-transparent rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8">
        <div
          className="relative w-full max-w-6xl h-96 sm:h-[500px] mb-12 sm:mb-16"
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ perspective: '1200px' }}
          >
            {images.map((image, index) => {
              const angleInRadians = ((rotatingCards[index] || 0) * Math.PI) / 180;
              const radius = 200;
              const translateX = Math.cos(angleInRadians) * radius;
              const translateY = Math.sin(angleInRadians) * radius;
              const perspectiveX = (mousePosition.x - 0.5) * 20;
              const perspectiveY = (mousePosition.y - 0.5) * 20;

              return (
                <div
                  key={image.id}
                  className="absolute w-32 h-40 sm:w-40 sm:h-48 transition-transform duration-300"
                  style={{
                    transform: `translate(${translateX}px, ${translateY}px) rotateX(${perspectiveY}deg) rotateY(${perspectiveX}deg) rotateZ(${image.rotation}deg)`,
                    transformStyle: 'preserve-3d',
                  }}
                >
                  <div
                    className={cn(
                      'relative w-full h-full rounded-2xl overflow-hidden shadow-2xl',
                      'transition-transform duration-300 hover:shadow-3xl hover:scale-110',
                      'cursor-pointer group',
                    )}
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    <img
                      src={image.src || '/placeholder.svg'}
                      alt={image.alt}
                      loading={index < 3 ? 'eager' : 'lazy'}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative z-20 text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          {subtitle && (
            <p className="text-sm sm:text-base uppercase tracking-[0.3em] text-blue-200 mb-3 sm:mb-4">
              {subtitle}
            </p>
          )}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-white mb-4 sm:mb-6 leading-tight">
            {title}
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 mb-8">{description}</p>
          <button
            type="button"
            onClick={onCtaClick}
            className={cn(
              'inline-flex items-center gap-2 px-8 py-3 rounded-full',
              'bg-blue-600 text-white font-medium',
              'hover:shadow-lg hover:scale-105 transition-all duration-300',
              'active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900',
              'group',
            )}
          >
            {ctaText}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        <div className="relative z-20 w-full max-w-4xl grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 mt-12 sm:mt-16">
          {featureCards.map((feature, index) => (
            <div
              key={`${feature.title}-${index}`}
              className={cn(
                'text-center p-6 rounded-xl',
                'bg-white/5 backdrop-blur-sm border border-white/10',
                'hover:bg-white/10 hover:border-white/20 transition-all duration-300',
                'group',
              )}
            >
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-2 transition-colors group-hover:text-blue-300">
                {feature.title}
              </h3>
              <p className="text-sm sm:text-base text-slate-300">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
