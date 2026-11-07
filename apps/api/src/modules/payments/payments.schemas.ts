import { PAYMENT_METHODS } from "./payments.types.js";

// Formato público de um pagamento aprovado. Mora no módulo de pagamentos, dono desse dado; quem
// expõe rotas de pagamento (pedidos) só registra o schema.
export const paymentSchema = {
  $id: "Payment",
  type: "object",
  description: "Pagamento simulado aprovado",
  additionalProperties: false,
  required: ["id", "method", "status", "amountCents", "receiptCode", "createdAt"],
  properties: {
    id: { type: "string", format: "uuid" },
    method: { type: "string", enum: [...PAYMENT_METHODS] },
    status: { type: "string", enum: ["approved"] },
    amountCents: { type: "integer", description: "Valor simulado, em centavos", examples: [14470] },
    receiptCode: {
      type: "string",
      description: "Código do recibo simulado",
      examples: ["DZ-3F8C2A1E"],
    },
    createdAt: { type: "string", format: "date-time" },
  },
} as const;

export const paymentMethodSchema = {
  type: "string",
  enum: [...PAYMENT_METHODS],
  description:
    "pix: Pix simulado · toy_card: cartão simulado · broke_toy_card: cartão simulado sem saldo, " +
    "sempre recusado (para ver a tela de recusa)",
} as const;
