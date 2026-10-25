export interface ProductPhoto {
  src: string;
  caption: string;
}
export interface Product {
  id: string;
  name: string;
  ingredient: string;
  image: string;
  imageProvided?: boolean;
  imageSource?: 'local' | 'csv';
  imageCaption?: string;
  photos?: ProductPhoto[];
  category: string;
  description: string;
  demo: boolean;
}
export interface Question {
  id: string;
  productId: string;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation?: string;
  explanationReviewed?: boolean;
}
export interface Answer {
  questionId: string;
  selectedIndex: number;
  correct: boolean;
}
export type Screen = 'home' | 'products' | 'clinic' | 'consultation' | 'quiz' | 'result';
export interface GameState {
  screen: Screen;
  productId: string;
  questions: Question[];
  answers: Answer[];
  selectedIndex: number | null;
  submitted: boolean;
  error: string;
}
