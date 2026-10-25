import type { GameState, Question, Screen } from '../types';
import { drawQuestions, gradeAnswer, QUESTION_COUNT } from './quiz';
export const initialState: GameState = {
  screen: 'home',
  productId: 'demo',
  questions: [],
  answers: [],
  selectedIndex: null,
  submitted: false,
  error: '',
};
export type Action =
  | { type: 'NAVIGATE'; screen: Screen }
  | { type: 'ENTER_ROOM' }
  | { type: 'RETURN_TO_CLINIC' }
  | { type: 'BEGIN_QUIZ' }
  | { type: 'SELECT_PRODUCT'; id: string }
  | { type: 'DEFAULT_PRODUCT'; id: string }
  | { type: 'START'; bank: Question[] }
  | { type: 'SELECT'; index: number }
  | { type: 'SUBMIT' }
  | { type: 'NEXT' };
export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'DEFAULT_PRODUCT':
      return ['home', 'products'].includes(state.screen) && state.productId === 'demo'
        ? { ...state, productId: action.id }
        : state;
    case 'ENTER_ROOM':
      return state.screen === 'clinic' ? { ...state, screen: 'consultation' } : state;
    case 'RETURN_TO_CLINIC':
      return state.screen === 'consultation' ? { ...state, screen: 'clinic' } : state;
    case 'BEGIN_QUIZ':
      return state.screen === 'consultation' && state.questions.length === QUESTION_COUNT
        ? { ...state, screen: 'quiz' }
        : state;
    case 'NAVIGATE':
      return { ...initialState, productId: state.productId, screen: action.screen };
    case 'SELECT_PRODUCT':
      return { ...initialState, productId: action.id, screen: 'products' };
    case 'START':
      try {
        return {
          ...initialState,
          productId: state.productId,
          screen: 'clinic',
          questions: drawQuestions(action.bank, state.productId),
        };
      } catch (error) {
        return { ...state, error: (error as Error).message };
      }
    case 'SELECT':
      return state.screen === 'quiz' &&
        !state.submitted &&
        Number.isInteger(action.index) &&
        action.index >= 0 &&
        action.index < 4
        ? { ...state, selectedIndex: action.index }
        : state;
    case 'SUBMIT': {
      if (state.screen !== 'quiz' || state.submitted || state.selectedIndex === null) return state;
      const q = state.questions[state.answers.length];
      if (!q) return state;
      return {
        ...state,
        submitted: true,
        answers: [...state.answers, gradeAnswer(q, state.selectedIndex)],
      };
    }
    case 'NEXT':
      if (!state.submitted) return state;
      return {
        ...state,
        screen: state.answers.length === QUESTION_COUNT ? 'result' : 'quiz',
        selectedIndex: null,
        submitted: false,
      };
  }
}
