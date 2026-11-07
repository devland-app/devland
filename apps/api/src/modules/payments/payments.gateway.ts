import { randomUUID } from "node:crypto";

import type { ChargeRequest, ChargeResult } from "./payments.types.js";

// Padrão Strategy: o módulo depende só desta interface. A loja usa o gateway de mentirinha; um
// gateway real seria outra implementação com a mesma interface, sem mudar quem a usa.
export interface PaymentGateway {
  charge(request: ChargeRequest): Promise<ChargeResult>;
}

// Nada sai daqui para lugar nenhum: a decisão é tomada na hora, sem rede e sem dinheiro.
// A demora do "processando…" é só visual, no front.
export class FakePaymentGateway implements PaymentGateway {
  async charge(request: ChargeRequest): Promise<ChargeResult> {
    if (request.method === "broke_toy_card") {
      return {
        status: "declined",
        reason:
          "O cartão de brinquedo está sem saldo de mentirinha. Escolha outra forma de pagamento.",
      };
    }
    return { status: "approved", receiptCode: `DZ-${randomUUID().slice(0, 8).toUpperCase()}` };
  }
}
