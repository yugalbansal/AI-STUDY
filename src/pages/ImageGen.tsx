import React from 'react';
import ImageGenerator from '../components/ImageGenerator';
import { Card } from '../components/ui/card';

export default function ImageGen() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Mobile Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">AI Image Generation</h1>
        <p className="text-white/60 text-sm sm:text-base leading-relaxed">
          Create custom images using AI. Simply describe what you want to see, and our AI will generate it for you.
          You can create variations of the same image or try different prompts to get exactly what you need.
        </p>
      </div>
      
      <Card className="mb-6 sm:mb-8">
        <div className="p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-white">Tips for Great Results</h2>
          <ul className="list-disc pl-4 sm:pl-5 space-y-1.5 sm:space-y-2 text-white/80 text-sm sm:text-base">
            <li>Be specific about what you want to see in the image</li>
            <li>Include details about style, lighting, and composition</li>
            <li>Try phrases like "professional photography," "detailed," or "high quality"</li>
            <li>Use the "New Variation" button to get different versions with the same prompt</li>
            <li>For completely different results, change your prompt and generate again</li>
          </ul>
        </div>
      </Card>
      
      <Card>
        <ImageGenerator />
      </Card>
    </div>
  );
}
