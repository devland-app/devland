export interface Wallet {
  // UUID: sem login, quem tem o código usa a carteira (a mesma ideia dos pedidos).
  id: string;
  balanceCoins: number;
  createdAt: string;
}

// Por que o saldo mudou: acerto num quiz (crédito) ou adoção de um mascote (débito).
export type WalletEntryReason = "quiz_answer" | "order_payment";

export interface WalletMovement {
  walletId: string;
  // Sempre positivo: quem chama diz se é crédito ou débito.
  amountCoins: number;
  reason: WalletEntryReason;
  // O que gerou o movimento (a resposta do quiz, o pedido). O banco não aceita a mesma referência
  // duas vezes para o mesmo motivo: nem um clique duplo credita ou debita em dobro.
  reference: string;
}
