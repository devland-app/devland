// Espelho dos schemas do contrato (docs/openapi.yaml). Valores em moedas virtuais (inteiras),
// datas em ISO 8601.

export interface Product {
  id: number;
  slug: string;
  name: string;
  concept: string;
  description: string;
  priceCoins: number;
  stock: number;
  imageUrl: string;
  // O conceito de DevOps que o mascote ensina.
  lesson: {
    explanation: string;
    realWorld: string;
    inProject: string;
  };
}

export interface OrderItem {
  productId: number;
  productName: string;
  unitPriceCoins: number;
  quantity: number;
  subtotalCoins: number;
}

export interface Order {
  id: string;
  status: "awaiting_payment" | "paid";
  items: OrderItem[];
  totalCoins: number;
  createdAt: string;
  paidAt: string | null;
}

// "coins" é a forma de pagamento atual; as outras só aparecem em pedidos de antes das moedas.
export type PaymentMethod = "coins" | "pix" | "toy_card" | "broke_toy_card";

export interface Payment {
  id: string;
  method: PaymentMethod;
  status: "approved";
  amountCoins: number;
  receiptCode: string;
  createdAt: string;
}

export interface PayOrderResponse {
  notice: string;
  order: Order;
  payment: Payment;
}

export interface CartItemRequest {
  productId: number;
  quantity: number;
}

export interface Wallet {
  id: string;
  balanceCoins: number;
  createdAt: string;
}

export interface QuizSummary {
  slug: string;
  title: string;
  concept: string;
  questionCount: number;
  coinsPerCorrectAnswer: number;
}

export interface QuizOption {
  id: string;
  text: string;
}

// A pergunta chega sem a resposta certa: quem corrige é a API.
export interface QuizQuestion {
  id: string;
  prompt: string;
  options: QuizOption[];
}

export interface QuizAttempt {
  id: string;
  quizSlug: string;
  title: string;
  concept: string;
  coinsPerCorrectAnswer: number;
  questions: QuizQuestion[];
}

export interface QuizAnswerResult {
  correct: boolean;
  correctOptionId: string;
  explanation: string;
  coinsAwarded: number;
  balanceCoins: number;
  answeredCount: number;
  questionCount: number;
}
