import React, { useRef } from 'react';
import { StoryStyle } from '../types';

interface InputSectionProps {
  input: string;
  setInput: (val: string) => void;
  selectedStyle: StoryStyle;
  setStyle: (style: StoryStyle) => void;
  onGenerate: () => void;
  isLoading: boolean;
  selectedImage: string | null;
  setSelectedImage: (img: string | null) => void;
}

const STYLES: { id: StoryStyle; emoji: string; label: string; color: string }[] = [
  { id: 'Daily', emoji: '☀️', label: 'Daily', color: 'bg-brand-blue' },
  { id: 'Bedtime', emoji: '🌙', label: 'Bedtime', color: 'bg-brand-purple' },
  { id: 'Adventure', emoji: '🚀', label: 'Adventure', color: 'bg-brand-orange' },
  { id: 'FairyTale', emoji: '🏰', label: 'Fairy Tale', color: 'bg-brand-pink' },
];

export const InputSection: React.FC<InputSectionProps> = ({
  input,
  setInput,
  selectedStyle,
  setStyle,
  onGenerate,
  isLoading,
  selectedImage,
  setSelectedImage
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-3xl p-6 shadow-xl border-4 border-brand-yellow">
      <div className="mb-4 text-center">
        <h2 className="text-2xl font-bold text-gray-800">Create a Story</h2>
        <p className="text-gray-500 text-sm">What happened today?</p>
      </div>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="E.g., We went to the park, saw a big dog, and ate ice cream."
        className="w-full h-28 p-4 rounded-2xl bg-gray-50 border-2 border-brand-yellow focus:border-brand-orange focus:outline-none text-gray-700 text-lg resize-none mb-4"
        disabled={isLoading}
      />

      {/* Image Upload Section */}
      <div className="mb-4">
        {!selectedImage ? (
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="w-full py-3 border-2 border-dashed border-brand-blue/50 rounded-xl text-brand-blue hover:bg-brand-blue/5 transition-colors flex items-center justify-center gap-2"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <span className="font-bold text-sm">Add a Picture (Optional)</span>
          </button>
        ) : (
          <div className="relative w-full h-40 bg-gray-100 rounded-xl overflow-hidden border-2 border-brand-blue group">
            <img src={selectedImage} alt="Upload preview" className="w-full h-full object-cover" />
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        )}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-bold text-gray-600 mb-2 ml-1">Choose Style</label>
        <div className="flex justify-between gap-2">
          {STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => setStyle(style.id)}
              disabled={isLoading}
              className={`flex-1 flex flex-col items-center justify-center p-2 rounded-xl transition-all transform active:scale-95 ${
                selectedStyle === style.id
                  ? `${style.color} text-white shadow-md scale-105 ring-2 ring-offset-2 ring-gray-200`
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              <span className="text-xl mb-1">{style.emoji}</span>
              <span className="text-xs font-bold">{style.label}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onGenerate}
        disabled={isLoading || (!input.trim() && !selectedImage)}
        className={`w-full py-4 rounded-full text-xl font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center justify-center ${
          isLoading || (!input.trim() && !selectedImage)
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-gradient-to-r from-brand-orange to-brand-pink hover:shadow-xl'
        }`}
      >
        {isLoading ? (
          <span className="flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Magic Happening...
          </span>
        ) : (
          '✨ Generate Story'
        )}
      </button>
      
      <div className="mt-4 flex justify-center">
         <button 
            onClick={() => setInput("Teddy bear, slide, apple, park")}
            className="text-xs text-gray-400 underline hover:text-brand-blue"
         >
            Try: "Teddy bear, slide, apple, park"
         </button>
      </div>
    </div>
  );
};