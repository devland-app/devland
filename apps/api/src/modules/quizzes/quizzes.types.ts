export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: QuizOption[];
  correctOptionId: string;
  explanation: string;
}

export interface Quiz {
  slug: string;
  title: string;
  concept: string;
  questions: QuizQuestion[];
}

export interface QuizSummary {
  slug: string;
  title: string;
  concept: string;
  questionCount: number;
  coinsPerCorrectAnswer: number;
}

// Pergunta como sai para o navegador: sem a resposta certa nem a explicação.
export interface PublicQuestion {
  id: string;
  prompt: string;
  options: QuizOption[];
}

export interface QuizAttempt {
  // UUID: é o código que permite responder a tentativa.
  id: string;
  quizSlug: string;
  walletId: string;
  questionIds: string[];
  createdAt: string;
}

export interface StartedAttempt {
  id: string;
  quizSlug: string;
  title: string;
  concept: string;
  coinsPerCorrectAnswer: number;
  questions: PublicQuestion[];
}

export interface AnswerResult {
  correct: boolean;
  correctOptionId: string;
  explanation: string;
  coinsAwarded: number;
  balanceCoins: number;
  answeredCount: number;
  questionCount: number;
}
