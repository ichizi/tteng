import React, { useState, useEffect, useRef } from 'react';
import { StoryResponse, Keyword, TeachingWord } from '../types';
import { generateSpeech } from '../services/geminiService';
import { playPCM } from '../utils/audioUtils';

interface StoryDisplayProps {
  story: StoryResponse;
  onReset: () => void;
  imageUrl: string | null;
}

const getHighlightClass = (word: string, keywords: Keyword[], teachingWords: TeachingWord[]) => {
  const cleanWord = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
  
  // Check user keywords (Priority 1)
  if (keywords.some(k => k.en.toLowerCase() === cleanWord)) {
    return "bg-brand-yellow/40 text-orange-800 font-bold px-1 rounded cursor-pointer border-b-2 border-brand-orange";
  }
  // Check teaching words (Priority 2)
  if (teachingWords.some(t => t.en.toLowerCase() === cleanWord)) {
    return "bg-brand-green/30 text-green-800 font-bold px-1 rounded cursor-pointer border-b-2 border-brand-green";
  }
  return "";
};

export const StoryDisplay: React.FC<StoryDisplayProps> = ({ story, onReset, imageUrl }) => {
  const [localStory, setLocalStory] = useState<StoryResponse>(story);
  const [isEditing, setIsEditing] = useState(false);
  
  // Audio State
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [loadingAudioIndex, setLoadingAudioIndex] = useState<number | null>(null);
  const [audioCache, setAudioCache] = useState<Record<string, string>>({});
  
  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  // Map to track in-flight requests to prevent double-fetching
  const speechPromiseMap = useRef<Record<string, Promise<string | null>>>({});

  // Sync local state when prop changes and reset edit mode
  useEffect(() => {
    setLocalStory(story);
    setIsEditing(false);
    setAudioCache({}); 
    speechPromiseMap.current = {};
  }, [story]);

  // --- PREFETCHING LOGIC ---
  // Automatically fetch audio for sentences and keywords as soon as the story appears
  useEffect(() => {
    const prefetchAll = async () => {
      const textsToPreload = [
        ...localStory.english,
        ...localStory.keywords.map(k => k.en),
        ...localStory.teaching_words.map(t => t.en)
      ];

      // Fetch sequentially to avoid hitting potential rate limits too hard, 
      // but fast enough to be ready when user clicks.
      // We prioritize the first few sentences.
      for (const text of textsToPreload) {
        if (!text) continue;
        // Fire and forget the load process, don't await sequentially strictly if we want speed,
        // but here we use the loadAudio helper which handles deduplication.
        loadAudio(text); 
      }
    };

    if (!isEditing) {
      prefetchAll();
    }
  }, [localStory, isEditing]);

  // Helper: Handles caching and fetching logic
  const loadAudio = async (text: string): Promise<string | null> => {
    // 1. Check Cache
    if (audioCache[text]) {
      return audioCache[text];
    }

    // 2. Check In-Flight Requests
    if (speechPromiseMap.current[text]) {
      return speechPromiseMap.current[text];
    }

    // 3. Fetch New
    const promise = generateSpeech(text).then(base64 => {
      if (base64) {
        setAudioCache(prev => ({ ...prev, [text]: base64 }));
      }
      // Remove from promise map when done (optional, but keeps map clean-ish or allows retry)
      // keeping it in map is fine too as it resolves to value.
      return base64;
    });

    speechPromiseMap.current[text] = promise;
    return promise;
  };

  const handleSpeak = async (text: string, index: number) => {
    if (!text) return;

    // Initialize AudioContext
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    setLoadingAudioIndex(index);

    try {
      // loadAudio handles the "Wait if already fetching" or "Return cached" logic
      const base64 = await loadAudio(text);
      
      if (base64) {
        setLoadingAudioIndex(null); // Stop spinner before playing
        setSpeakingIndex(index);
        await playPCM(base64, audioContextRef.current!);
      }
    } catch (e) {
      console.error("Playback failed", e);
    } finally {
      setLoadingAudioIndex(null);
      setSpeakingIndex(null);
    }
  };

  const renderSentence = (text: string) => {
    const words = text.split(' ');
    return words.map((word, idx) => {
      const className = getHighlightClass(word, localStory.keywords, localStory.teaching_words);
      return (
        <span key={idx} className={`${className} inline-block mx-[2px]`}>
          {word}
        </span>
      );
    });
  };

  const handleTextChange = (lang: 'english' | 'chinese', index: number, value: string) => {
    setLocalStory(prev => {
      const updated = [...prev[lang]];
      updated[index] = value;
      return { ...prev, [lang]: updated };
    });
    // Note: Changing text will naturally trigger the useEffect, 
    // which calls prefetchAll -> loadAudio -> which will see the new text is not in cache and fetch it.
  };

  return (
    <div className="w-full max-w-2xl mx-auto pb-20">
      {/* Header Actions */}
      <div className="flex justify-between items-center mb-6 px-4">
        <button 
          onClick={onReset}
          className="bg-white p-2 rounded-full shadow hover:bg-gray-50 text-gray-500 transition-transform hover:scale-105"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
        </button>
        <h1 className="text-2xl font-bold text-brand-purple text-center flex-1 truncate px-2">{localStory.title}</h1>
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className={`p-2 rounded-full shadow transition-all transform hover:scale-105 ${isEditing ? 'bg-brand-green text-white ring-2 ring-offset-2 ring-brand-green' : 'bg-white hover:bg-gray-50 text-gray-500'}`}
          title={isEditing ? "Save" : "Edit Text"}
        >
          {isEditing ? (
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          ) : (
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
          )}
        </button>
      </div>

      {/* Main Image */}
      <div className="mx-4 mb-8 rounded-3xl overflow-hidden shadow-lg border-4 border-white relative aspect-video bg-gray-200">
        {imageUrl ? (
          <img 
             src={imageUrl} 
             alt="Story illustration" 
             className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
            <span className="text-4xl">🎨</span>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4">
             <span className="text-white font-bold text-sm bg-brand-orange px-2 py-1 rounded-lg">
               {imageUrl?.startsWith('data:') ? 'AI Illustration' : 'Story Image'}
             </span>
        </div>
      </div>

      {/* Story Sentences */}
      <div className="space-y-6 px-4">
        {localStory.english.map((sentence, idx) => (
          <div key={idx} className={`bg-white p-4 rounded-2xl shadow-sm transition-all ${speakingIndex === idx ? 'ring-4 ring-brand-blue scale-102' : 'border border-gray-100'}`}>
            <div className="flex items-start gap-3">
              {!isEditing && (
                <button 
                  onClick={() => handleSpeak(sentence, idx)}
                  disabled={speakingIndex !== null}
                  className={`mt-1 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors 
                    ${speakingIndex === idx ? 'bg-brand-blue text-white' : 'bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20'}
                    ${loadingAudioIndex === idx ? 'animate-pulse cursor-wait' : ''}
                  `}
                  title="Read Aloud (Natural Voice)"
                >
                  {loadingAudioIndex === idx ? (
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : speakingIndex === idx ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  )}
                </button>
              )}
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <label className="absolute -top-2 left-2 bg-white px-1 text-xs font-bold text-brand-blue">English</label>
                      <textarea 
                        value={sentence}
                        onChange={(e) => handleTextChange('english', idx, e.target.value)}
                        className="w-full p-3 border-2 border-brand-blue/30 rounded-xl font-sans text-lg focus:border-brand-blue focus:outline-none"
                        rows={2}
                      />
                    </div>
                    <div className="relative">
                       <label className="absolute -top-2 left-2 bg-white px-1 text-xs font-bold text-gray-400">Chinese</label>
                       <textarea 
                         value={localStory.chinese[idx]}
                         onChange={(e) => handleTextChange('chinese', idx, e.target.value)}
                         className="w-full p-3 border-2 border-gray-200 rounded-xl text-gray-600 focus:border-gray-400 focus:outline-none"
                         rows={2}
                       />
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xl text-gray-800 leading-relaxed mb-2 font-sans">
                      {renderSentence(sentence)}
                    </p>
                    <p className="text-gray-500 text-base font-light">
                      {localStory.chinese[idx]}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Learning Section */}
      <div className="mt-8 px-4">
        <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center">
            <span className="bg-brand-green text-white p-1 rounded mr-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            </span>
            Flashcards
        </h3>
        <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
          {[...localStory.keywords, ...localStory.teaching_words.map(t => ({ cn: t.note, en: t.en }))].map((word, idx) => (
            <div key={idx} className="flex-shrink-0 w-32 h-40 bg-white rounded-xl shadow-md border-2 border-brand-yellow flex flex-col items-center justify-center p-2 relative overflow-hidden group">
              <img src={`https://picsum.photos/100/100?random=${idx + 200}`} className="absolute inset-0 w-full h-full object-cover opacity-10" alt="card background" />
              <p className="text-xl font-bold text-brand-blue z-10 mb-1 capitalize">{word.en}</p>
              <p className="text-sm text-gray-500 z-10">{word.cn}</p>
              <button 
                 onClick={() => handleSpeak(word.en, 999)}
                 className="mt-3 bg-brand-orange text-white p-2 rounded-full z-10 shadow-sm active:scale-95"
                 disabled={loadingAudioIndex === 999}
              >
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Parent Tips */}
      <div className="mx-4 mt-4 bg-brand-pink/10 rounded-2xl p-5 border border-brand-pink/20">
         <h3 className="font-bold text-brand-pink mb-2 flex items-center">
            <svg className="mr-2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            Parent Tips
         </h3>
         <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
            {localStory.parent_tips.map((tip, idx) => (
                <li key={idx}>{tip}</li>
            ))}
         </ul>
      </div>
    </div>
  );
};