import { randomUUID } from "node:crypto";

import type { Transaction } from "../../shared/database.js";
import type { PaymentGateway } from "./payments.gateway.js";
import type { PaymentRepository } from "./payments.repository.js";
import type { ChargeRequest, ChargeResult, Payment } from "./payments.types.js";

// Regras de pagamento. Decidir (authorize) e gravar (record) são passos separados: quem coordena o
// pedido precisa gravar uma recusa fora da transação que desfaz a baixa de estoque.
export class PaymentsService {
  private readonly gateway: PaymentGateway;
  private readonly payments: PaymentRepository;

  constructor(gateway: PaymentGateway, payments: PaymentRepository) {
    this.gateway = gateway;
    this.payments = payments;
  }

  authorize(request: ChargeRequest, trx: Transaction): Promise<ChargeResult> {
    return this.gateway.charge(request, trx);
  }

  record(request: ChargeRequest, result: ChargeResult, trx?: Transaction): Promise<Payment> {
    return this.payments.save(
      {
        id: randomUUID(),
        orderId: request.orderId,
        walletId: request.walletId,
        method: "coins",
        status: result.status,
        amountCoins: request.amountCoins,
        receiptCode: result.status === "approved" ? result.receiptCode : null,
        declineReason: result.status === "declined" ? result.reason : null,
      },
      trx,
    );
  }

  findApprovedPayment(orderId: string): Promise<Payment | undefined> {
    return this.payments.findApprovedByOrderId(orderId);
  }
}
