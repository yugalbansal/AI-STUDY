import { ImageCarouselHero } from '@/components/ui/ai-image-generator-hero';

const demoImages = [
  {
    id: '1',
    src: 'https://images.unsplash.com/photo-1684369176170-463e84248b70?auto=format&fit=crop&q=60&w=900',
    alt: 'Mountain landscape above the clouds',
    rotation: -15,
  },
  {
    id: '2',
    src: 'https://plus.unsplash.com/premium_photo-1677269465314-d5d2247a0b0c?auto=format&fit=crop&q=60&w=900',
    alt: 'Vibrant abstract art with flowing shapes',
    rotation: -8,
  },
  {
    id: '3',
    src: 'https://images.unsplash.com/photo-1524673360092-e07b7ae58845?auto=format&fit=crop&q=60&w=900',
    alt: 'Futuristic city skyline at dusk',
    rotation: 5,
  },
  {
    id: '4',
    src: 'https://plus.unsplash.com/premium_photo-1680610653084-6e4886519caf?auto=format&fit=crop&q=60&w=900',
    alt: 'Macro shot of nature photography',
    rotation: 12,
  },
  {
    id: '5',
    src: 'https://plus.unsplash.com/premium_photo-1680608979589-e9349ed066d5?auto=format&fit=crop&q=60&w=900',
    alt: 'Digital art portrait with neon lighting',
    rotation: -12,
  },
  {
    id: '6',
    src: 'https://images.unsplash.com/photo-1562575214-da9fcf59b907?auto=format&fit=crop&q=60&w=900',
    alt: 'Tropical leaves with dramatic lighting',
    rotation: 8,
  },
  {
    id: '7',
    src: 'https://plus.unsplash.com/premium_photo-1676637656210-390da73f4951?auto=format&fit=crop&q=60&w=900',
    alt: 'Surreal tropical leaves composition',
    rotation: 8,
  },
  {
    id: '8',
    src: 'https://images.unsplash.com/photo-1664448003794-2d446c53dcae?auto=format&fit=crop&q=60&w=900',
    alt: 'Dreamy AI generated illustration',
    rotation: 8,
  },
];

const demoFeatures = [
  {
    title: 'Realistic Results',
    description: 'Photos that look professionally crafted with natural depth and detail.',
  },
  {
    title: 'Fast Generation',
    description: 'Turn your ideas into captivating imagery in just a few seconds.',
  },
  {
    title: 'Diverse Styles',
    description: 'Choose from photorealistic, painterly, cinematic, and futuristic looks.',
  },
];

export function ImageCarouselHeroDemo() {
  return (
    <ImageCarouselHero
      title="Create Stunning AI Generated Photos Instantly"
      subtitle="AI Photo Generation"
      description="Transform your ideas into breathtaking visuals with our cutting-edge diffusion models."
      ctaText="Start Generating Now"
      onCtaClick={() => console.log('CTA clicked!')}
      images={demoImages}
      features={demoFeatures}
    />
  );
}
