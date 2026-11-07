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
  // Soma do que todas as perguntas do quiz pagam: o preço do mascote do conceito.
  totalCoins: number;
  // Quanto a carteira consultada já ganhou neste quiz.
  earnedCoins: number;
}

// Pergunta como sai para o navegador: sem a resposta certa nem a explicação.
export interface PublicQuestion {
  id: string;
  prompt: string;
  options: QuizOption[];
  // O que o acerto paga, e se esta carteira já recebeu essas moedas antes.
  coins: number;
  alreadyEarned: boolean;
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
  totalCoins: number;
  earnedCoins: number;
  questions: PublicQuestion[];
}

export interface AnswerResult {
  correct: boolean;
  correctOptionId: string;
  explanation: string;
  coinsAwarded: number;
  // Acertou, mas as moedas desta pergunta já tinham sido ganhas numa tentativa anterior.
  alreadyEarned: boolean;
  balanceCoins: number;
  answeredCount: number;
  questionCount: number;
}
