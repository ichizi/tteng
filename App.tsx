import React, { useState } from 'react';
import { InputSection } from './components/InputSection';
import { StoryDisplay } from './components/StoryDisplay';
import { generateStory, generateIllustration } from './services/geminiService';
import { StoryResponse, StoryStyle } from './types';

export default function App() {
  const [input, setInput] = useState('');
  const [style, setStyle] = useState<StoryStyle>('Daily');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [story, setStory] = useState<StoryResponse | null>(null);
  const [displayImage, setDisplayImage] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!input.trim() && !selectedImage) return;
    
    setIsLoading(true);
    setError(null);
    setStory(null);
    setDisplayImage(null);
    
    try {
      // 1. Generate Story Text (passing image if user uploaded one to influence story)
      const result = await generateStory(input, style, selectedImage || undefined);
      setStory(result);

      // 2. Handle Image Display
      if (selectedImage) {
        // Scenario A: User uploaded an image
        setDisplayImage(selectedImage);
      } else {
        // Scenario B: Generate an AI Illustration based on the new story
        const aiImage = await generateIllustration(result.title, result.english[0]);
        setDisplayImage(aiImage);
      }

    } catch (err) {
      setError("Oops! Couldn't generate the story. Please check your internet or API key.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStory(null);
    setDisplayImage(null);
    setError(null);
    // Optional: keep input/image state or clear it. Keeping it allows easy re-edit.
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-800">
      {/* Top decorative bar */}
      <div className="h-2 bg-gradient-to-r from-brand-yellow via-brand-pink to-brand-blue" />

      <main className="flex-1 container mx-auto px-4 py-8">
        
        {!story ? (
          <div className="flex flex-col items-center justify-center min-h-[80vh]">
             <div className="mb-8 text-center">
                <div className="inline-block bg-white p-4 rounded-full shadow-lg mb-4 border-4 border-brand-green">
                    <span className="text-4xl">🐻</span>
                </div>
                <h1 className="text-4xl font-bold text-brand-blue mb-2 tracking-tight">TinyTales</h1>
                <p className="text-brand-orange font-medium">Turn your day into a magic story!</p>
             </div>

            <InputSection 
              input={input}
              setInput={setInput}
              selectedStyle={style}
              setStyle={setStyle}
              onGenerate={handleGenerate}
              isLoading={isLoading}
              selectedImage={selectedImage}
              setSelectedImage={setSelectedImage}
            />

            {error && (
               <div className="mt-6 p-4 bg-red-100 border-2 border-red-200 text-red-600 rounded-xl text-center max-w-md animate-bounce">
                  {error}
               </div>
            )}
          </div>
        ) : (
          <StoryDisplay 
            story={story} 
            onReset={handleReset}
            imageUrl={displayImage}
          />
        )}
      </main>
      
      {/* Footer */}
      {!story && (
         <footer className="text-center py-6 text-gray-400 text-sm">
            <p>© 2024 TinyTales • Powered by Gemini 2.5</p>
         </footer>
      )}
    </div>
  );
}