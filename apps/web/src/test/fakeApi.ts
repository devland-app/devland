// Backend falso, em memória, com as mesmas regras da API real: estoque, carteira que não fica
// negativa, idempotência dos pedidos, pagamento repetido sem novo débito e cada pergunta paga uma
// vez por carteira. Os testes da interface usam esta API no lugar do client.ts.
import type {
  CartItemRequest,
  Order,
  PayOrderResponse,
  Product,
  QuizAnswerResult,
  QuizAttempt,
  QuizSummary,
  Wallet,
} from "../shared/api/types.ts";

type ApiErrorClass = new (status: number, message: string) => Error;

const LESSON = {
  explanation: "Um contêiner é uma caixinha com tudo de que o programa precisa.",
  realWorld: "É como mudar de casa com tudo em caixas etiquetadas.",
  inProject: "A DevLand roda em três contêineres.",
};

export const PRODUCTS: Product[] = [
  ["caranguejo-dos-conteineres", "Caranguejo dos Contêineres", "Contêineres", 120],
  ["corujinha-das-branches", "Corujinha das Branches", "Controle de versão", 80],
  ["abelha-dos-logs", "Abelha dos Logs", "Observabilidade", 80],
].map(([slug, name, concept, price], index) => ({
  id: index + 1,
  slug: String(slug),
  name: String(name),
  concept: String(concept),
  description: `Descrição de ${String(name)}.`,
  priceCoins: Number(price),
  stock: 10,
  imageUrl: `/images/mascots/${String(slug)}.svg?v=12345678`,
  lesson: LESSON,
}));

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><g class="eye"/></svg>';
const NOW = "2026-11-07T12:00:00.000Z";

export class FakeBackend {
  readonly wallets = new Map<string, number>();
  readonly orders = new Map<string, Order>();
  readonly keys = new Map<string, string>();
  readonly earned = new Set<string>();
  readonly attempts = new Map<string, { walletId: string; slug: string }>();
  readonly products: Product[] = structuredClone(PRODUCTS);
  private readonly failures = new Map<string, Error>();
  private readonly ApiError: ApiErrorClass;

  constructor(ApiError: ApiErrorClass) {
    this.ApiError = ApiError;
  }

  // A próxima chamada do método falha com este erro (rede caiu, API recusou…).
  failNext(method: keyof FakeBackend, status: number, message: string): void {
    this.failures.set(method, new this.ApiError(status, message));
  }

  private check(method: keyof FakeBackend): void {
    const failure = this.failures.get(method);
    if (failure) {
      this.failures.delete(method);
      throw failure;
    }
  }

  private questionsOf(slug: string) {
    const product = this.products.find((item) => item.slug === slug);
    if (!product) throw new this.ApiError(404, "Quiz não encontrado.");
    return [1, 2].map((number) => ({
      id: `${slug}-${number}`,
      prompt: `Pergunta ${number} sobre ${product.concept}?`,
      options: [
        { id: `${slug}-${number}-certa`, text: `Certa ${number}` },
        { id: `${slug}-${number}-errada`, text: `Errada ${number}` },
      ],
      coins: product.priceCoins / 2,
    }));
  }

  async listProducts(): Promise<Product[]> {
    this.check("listProducts");
    return structuredClone(this.products);
  }

  async getMascotSvg(): Promise<string> {
    this.check("getMascotSvg");
    return SVG;
  }

  async createWallet(): Promise<Wallet> {
    this.check("createWallet");
    const id = crypto.randomUUID();
    this.wallets.set(id, 0);
    return { id, balanceCoins: 0, createdAt: NOW };
  }

  async getWallet(id: string): Promise<Wallet> {
    this.check("getWallet");
    const balance = this.wallets.get(id);
    if (balance === undefined) throw new this.ApiError(404, "Carteira não encontrada.");
    return { id, balanceCoins: balance, createdAt: NOW };
  }

  async listQuizzes(walletId?: string | null): Promise<QuizSummary[]> {
    this.check("listQuizzes");
    return this.products.map((product) => {
      const questions = this.questionsOf(product.slug);
      return {
        slug: product.slug,
        title: `Quiz de ${product.concept}`,
        concept: product.concept,
        questionCount: questions.length,
        totalCoins: product.priceCoins,
        earnedCoins: questions
          .filter((question) => this.earned.has(`${walletId}:${question.id}`))
          .reduce((sum, question) => sum + question.coins, 0),
      };
    });
  }

  async startQuizAttempt(slug: string, walletId: string): Promise<QuizAttempt> {
    this.check("startQuizAttempt");
    if (!this.wallets.has(walletId)) throw new this.ApiError(422, "Carteira não encontrada.");
    const questions = this.questionsOf(slug);
    const product = this.products.find((item) => item.slug === slug) as Product;
    const id = crypto.randomUUID();
    this.attempts.set(id, { walletId, slug });
    return {
      id,
      quizSlug: slug,
      title: `Quiz de ${product.concept}`,
      concept: product.concept,
      totalCoins: product.priceCoins,
      earnedCoins: questions
        .filter((question) => this.earned.has(`${walletId}:${question.id}`))
        .reduce((sum, question) => sum + question.coins, 0),
      questions: questions.map((question) => ({
        ...question,
        alreadyEarned: this.earned.has(`${walletId}:${question.id}`),
      })),
    };
  }

  async answerQuizQuestion(
    attemptId: string,
    questionId: string,
    optionId: string,
  ): Promise<QuizAnswerResult> {
    this.check("answerQuizQuestion");
    const attempt = this.attempts.get(attemptId);
    if (!attempt) throw new this.ApiError(404, "Tentativa não encontrada.");
    const question = this.questionsOf(attempt.slug).find((item) => item.id === questionId);
    if (!question) throw new this.ApiError(422, "Essa pergunta não faz parte desta tentativa.");
    const correct = optionId.endsWith("-certa");
    const key = `${attempt.walletId}:${questionId}`;
    const alreadyEarned = correct && this.earned.has(key);
    const coinsAwarded = correct && !alreadyEarned ? question.coins : 0;
    if (coinsAwarded > 0) {
      this.earned.add(key);
      this.wallets.set(attempt.walletId, (this.wallets.get(attempt.walletId) ?? 0) + coinsAwarded);
    }
    return {
      correct,
      correctOptionId: `${questionId}-certa`,
      explanation: `Explicação de ${questionId}.`,
      coinsAwarded,
      alreadyEarned,
      balanceCoins: this.wallets.get(attempt.walletId) ?? 0,
      answeredCount: 1,
      questionCount: 2,
    };
  }

  async createOrder(items: CartItemRequest[], idempotencyKey: string): Promise<Order> {
    this.check("createOrder");
    const existing = this.keys.get(idempotencyKey);
    if (existing) return structuredClone(this.orders.get(existing) as Order);
    const lines = items.map((item) => {
      const product = this.products.find((candidate) => candidate.id === item.productId);
      if (!product) throw new this.ApiError(422, "Algum produto do carrinho não existe mais.");
      return {
        productId: product.id,
        productName: product.name,
        unitPriceCoins: product.priceCoins,
        quantity: item.quantity,
        subtotalCoins: product.priceCoins * item.quantity,
      };
    });
    const order: Order = {
      id: crypto.randomUUID(),
      status: "awaiting_payment",
      items: lines,
      totalCoins: lines.reduce((sum, line) => sum + line.subtotalCoins, 0),
      createdAt: NOW,
      paidAt: null,
    };
    this.orders.set(order.id, order);
    this.keys.set(idempotencyKey, order.id);
    return structuredClone(order);
  }

  async getOrder(id: string): Promise<Order> {
    this.check("getOrder");
    const order = this.orders.get(id);
    if (!order) throw new this.ApiError(404, "Pedido não encontrado.");
    return structuredClone(order);
  }

  async payOrder(id: string, walletId: string): Promise<PayOrderResponse> {
    this.check("payOrder");
    const order = this.orders.get(id);
    if (!order) throw new this.ApiError(404, "Pedido não encontrado.");
    if (order.status !== "paid") {
      const balance = this.wallets.get(walletId) ?? 0;
      const missing = order.totalCoins - balance;
      if (missing > 0) {
        throw new this.ApiError(
          402,
          `Saldo insuficiente: faltam ${missing} moedas. Responda um quiz para ganhar mais.`,
        );
      }
      this.wallets.set(walletId, balance - order.totalCoins);
      order.status = "paid";
      order.paidAt = NOW;
    }
    return {
      notice: "Pago com moedas virtuais: nenhum dinheiro foi usado.",
      order: structuredClone(order),
      payment: {
        id: `pagamento-${id}`,
        method: "coins",
        status: "approved",
        amountCoins: order.totalCoins,
        receiptCode: "DL-TESTE001",
        createdAt: NOW,
      },
    };
  }
}

// O backend usado pelos testes da vez; cada teste cria um novo em beforeEach.
export const fake: { backend: FakeBackend | null } = { backend: null };

function backend(): FakeBackend {
  if (!fake.backend) throw new Error("Crie o FakeBackend no beforeEach do teste");
  return fake.backend;
}

// Funções com a mesma assinatura do client.ts, para o vi.mock trocar a API real por esta.
export const fakeClient = {
  listProducts: () => backend().listProducts(),
  getMascotSvg: () => backend().getMascotSvg(),
  createWallet: () => backend().createWallet(),
  getWallet: (id: string) => backend().getWallet(id),
  listQuizzes: (walletId?: string | null) => backend().listQuizzes(walletId),
  startQuizAttempt: (slug: string, walletId: string) => backend().startQuizAttempt(slug, walletId),
  answerQuizQuestion: (attemptId: string, questionId: string, optionId: string) =>
    backend().answerQuizQuestion(attemptId, questionId, optionId),
  createOrder: (items: CartItemRequest[], key: string) => backend().createOrder(items, key),
  getOrder: (id: string) => backend().getOrder(id),
  payOrder: (id: string, walletId: string) => backend().payOrder(id, walletId),
};
