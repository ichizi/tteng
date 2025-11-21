export interface Keyword {
  cn: string;
  en: string;
  type?: 'input' | 'teaching'; // Distinguished type
}

export interface TeachingWord {
  en: string;
  note: string;
}

export interface StoryResponse {
  title: string;
  english: string[];
  chinese: string[];
  keywords: Keyword[];
  teaching_words: TeachingWord[];
  parent_tips: string[];
}

export type StoryStyle = 'Daily' | 'Bedtime' | 'Adventure' | 'FairyTale';

export interface AppState {
  story: StoryResponse | null;
  isLoading: boolean;
  error: string | null;
  input: string;
  selectedStyle: StoryStyle;
}
