import type { Database } from "../../shared/database.js";
import { CoinsPaymentGateway, type CoinDebit } from "./payments.gateway.js";
import { KnexPaymentRepository } from "./payments.repository.js";
import { PaymentsService } from "./payments.service.js";

// API pública do módulo de pagamentos: é a única porta de entrada para o resto da aplicação.
export { paymentsMigrations } from "./payments.migrations.js";
export { PAYMENT_METHODS } from "./payments.types.js";
export { paymentSchema } from "./payments.schemas.js";
export type { PaymentsService } from "./payments.service.js";
export type { ChargeRequest, ChargeResult, Payment, PaymentMethod } from "./payments.types.js";

export interface PaymentsModule {
  service: PaymentsService;
}

// Composição do módulo: o gateway de moedas é escolhido aqui, e a carteira chega de fora
// (payments → wallets). Trocar a forma de pagamento seria mudar só esta linha (padrão Strategy).
export function createPaymentsModule(db: Database, wallets: CoinDebit): PaymentsModule {
  return {
    service: new PaymentsService(new CoinsPaymentGateway(wallets), new KnexPaymentRepository(db)),
  };
}
