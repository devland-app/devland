import { PAYMENT_METHODS } from "./payments.types.js";

// Formato público de um pagamento aprovado. Mora no módulo de pagamentos, dono desse dado; quem
// expõe rotas de pagamento (pedidos) só registra o schema.
export const paymentSchema = {
  $id: "Payment",
  type: "object",
  description: "Pagamento aprovado, feito com moedas virtuais",
  additionalProperties: false,
  required: ["id", "method", "status", "amountCoins", "receiptCode", "createdAt"],
  properties: {
    id: { type: "string", format: "uuid" },
    method: {
      type: "string",
      enum: [...PAYMENT_METHODS],
      description:
        "coins: moedas da carteira. pix, toy_card e broke_toy_card são formas simuladas de antes " +
        "das moedas e só aparecem em pedidos antigos.",
    },
    status: { type: "string", enum: ["approved"] },
    amountCoins: { type: "integer", description: "Moedas debitadas", examples: [200] },
    receiptCode: { type: "string", description: "Código do recibo", examples: ["DL-3F8C2A1E"] },
    createdAt: { type: "string", format: "date-time" },
  },
} as const;
