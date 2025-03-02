import React from 'react';
import ImageGenerator from '../components/ImageGenerator';

export default function ImageGen() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">AI Image Generation</h1>
      
      <div className="mb-6">
        <p className="text-gray-600">
          Create custom images using AI. Simply describe what you want to see, and our AI will generate it for you.
          You can create variations of the same image or try different prompts to get exactly what you need.
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Tips for Great Results</h2>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li>Be specific about what you want to see in the image</li>
          <li>Include details about style, lighting, and composition</li>
          <li>Try phrases like "professional photography," "detailed," or "high quality"</li>
          <li>Use the "New Variation" button to get different versions with the same prompt</li>
          <li>For completely different results, change your prompt and generate again</li>
        </ul>
      </div>
      
      <ImageGenerator />
    </div>
  );
}