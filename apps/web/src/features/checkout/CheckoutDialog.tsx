import "./checkout.css";

import { useEffect, useRef, useState } from "react";

import { useAdoptions } from "../../shared/adoptions/adoptionsContext.ts";
import { ApiError, apiAssetUrl, createOrder, payOrder } from "../../shared/api/client.ts";
import type { Order, Payment, PaymentMethod } from "../../shared/api/types.ts";
import { useCart } from "../../shared/cart/cartContext.ts";
import { useSound } from "../../shared/sound/soundContext.ts";
import { formatCents } from "../../shared/format.ts";
import { rememberOrder } from "../../shared/myOrders.ts";
import { Dialog } from "../../shared/ui/Dialog.tsx";
import { useProducts } from "../../shared/useProducts.ts";

import { burstConfetti } from "./confetti.ts";
import { PaymentPreview } from "./PaymentPreview.tsx";

type Step =
  | { name: "review"; busy: boolean; error?: string }
  | { name: "pay"; order: Order; error?: string }
  | { name: "processing"; order: Order }
  | { name: "done"; order: Order; payment: Payment };

const METHODS: Array<{ value: PaymentMethod; label: string; note: string }> = [
  { value: "pix", label: "Pix (simulado)", note: "QR code ilustrativo, sem valor real." },
  {
    value: "toy_card",
    label: "Cartão (simulado)",
    note: "Cartão ilustrativo, sem nenhum dado para preencher.",
  },
  {
    value: "broke_toy_card",
    label: "Cartão sem saldo (simulado)",
    note: "Mostra como fica um pagamento recusado.",
  },
];

// A API responde na hora; a espera curta só torna a etapa de pagamento perceptível.
const PROCESSING_MS = 1400;

const STEP_LABELS = [
  { key: "review", label: "1 · Revisão" },
  { key: "pay", label: "2 · Pagamento" },
  { key: "done", label: "3 · Pronto" },
] as const;

interface CheckoutDialogProps {
  onClose: () => void;
  // Pedido que ficou aguardando pagamento: o checkout começa direto no pagamento.
  resumeOrder?: Order;
}

// Montado só quando aberto: cada abertura começa do zero, com uma Idempotency-Key nova.
export function CheckoutDialog({ onClose, resumeOrder }: CheckoutDialogProps) {
  const cart = useCart();
  const adoptions = useAdoptions();
  const products = useProducts();
  const sound = useSound();
  const [step, setStep] = useState<Step>(
    resumeOrder ? { name: "pay", order: resumeOrder } : { name: "review", busy: false },
  );
  const [method, setMethod] = useState<PaymentMethod>("pix");
  // Gerada uma vez por tentativa de compra: clicar de novo devolve o mesmo pedido, sem duplicar.
  const idempotencyKey = useRef(crypto.randomUUID());
  const heading = useRef<HTMLHeadingElement>(null);

  // A cada etapa, o foco vai para o título dela: quem usa leitor de tela acompanha a mudança.
  useEffect(() => {
    heading.current?.focus();
  }, [step.name]);

  async function confirmOrder() {
    setStep({ name: "review", busy: true });
    try {
      const order = await createOrder(
        cart.lines.map((line) => ({ productId: line.productId, quantity: 1 })),
        idempotencyKey.current,
      );
      rememberOrder(order.id);
      // A partir daqui os mascotes ficam "Aguardando pagamento" (e saem do carrinho) até o pagamento.
      adoptions.recordOrder(order);
      setStep({ name: "pay", order });
    } catch (error) {
      setStep({ name: "review", busy: false, error: messageOf(error) });
    }
  }

  async function pay(order: Order) {
    setStep({ name: "processing", order });
    const settled = payOrder(order.id, method).then(
      (value) => ({ ok: true as const, value }),
      (error: unknown) => ({ ok: false as const, error }),
    );
    const [outcome] = await Promise.all([settled, wait(PROCESSING_MS)]);
    if (!outcome.ok) {
      setStep({ name: "pay", order, error: messageOf(outcome.error) });
      return;
    }
    adoptions.recordOrder(outcome.value.order);
    setStep({ name: "done", order: outcome.value.order, payment: outcome.value.payment });
    burstConfetti(themeColors());
    sound.play("chime");
  }

  const currentKey = step.name === "processing" ? "pay" : step.name;

  return (
    <Dialog open onClose={onClose} labelledBy="checkout-title" variant="modal">
      <div className="panel-head">
        <h2 id="checkout-title">Compra simulada</h2>
        <button
          className="btn btn--soft btn--icon"
          type="button"
          onClick={onClose}
          aria-label="Fechar checkout"
        >
          ×
        </button>
      </div>

      <ol className="steps" aria-label="Etapas da compra">
        {STEP_LABELS.map((item, index) => {
          const currentIndex = STEP_LABELS.findIndex((candidate) => candidate.key === currentKey);
          return (
            <li
              key={item.key}
              aria-current={item.key === currentKey ? "step" : undefined}
              className={index < currentIndex ? "done" : undefined}
            >
              {item.label}
            </li>
          );
        })}
      </ol>

      {step.name === "review" && (
        <div className="step">
          <h3 ref={heading} tabIndex={-1}>
            Confira o carrinho
          </h3>
          <ul className="summary">
            {cart.lines.map((line) => (
              <li key={line.productId}>
                <span>{line.name}</span>
                <span>{formatCents(line.priceCents)}</span>
              </li>
            ))}
          </ul>
          <div className="total-row">
            <span>Total estimado</span>
            <span>{formatCents(cart.estimatedTotalCents)}</span>
          </div>
          <p className="fine">
            O valor oficial é calculado pela loja no próximo passo. Nenhum valor será cobrado.
          </p>
          {step.error && (
            <p className="error-note" role="alert">
              {step.error}
            </p>
          )}
          <div className="step-actions">
            <button className="btn btn--soft" type="button" onClick={onClose}>
              Voltar
            </button>
            <button
              className="btn btn--mint"
              type="button"
              onClick={confirmOrder}
              disabled={step.busy || cart.lines.length === 0}
            >
              {step.busy ? "Criando pedido…" : "Ir para o pagamento"}
            </button>
          </div>
        </div>
      )}

      {step.name === "pay" && (
        <div className="step">
          <h3 ref={heading} tabIndex={-1}>
            Forma de pagamento
          </h3>
          <fieldset className="methods">
            <legend className="sr-only">Forma de pagamento simulada</legend>
            {METHODS.map((option) => (
              <label key={option.value} className="method">
                <input
                  type="radio"
                  name="payment-method"
                  value={option.value}
                  checked={method === option.value}
                  onChange={() => setMethod(option.value)}
                />
                <span className="dot" aria-hidden="true" />
                <strong>{option.label}</strong>
                <span className="note">{option.note}</span>
              </label>
            ))}
          </fieldset>
          <PaymentPreview method={method} orderId={step.order.id} />
          {step.error && (
            <p className="error-note" role="alert">
              {step.error}
            </p>
          )}
          <p className="fine">Esta loja nunca pede dados de cartão reais.</p>
          <div className="step-actions">
            <button className="btn btn--soft" type="button" onClick={onClose}>
              Pagar depois
            </button>
            <button className="btn btn--mint" type="button" onClick={() => pay(step.order)}>
              Pagar (simulação) · {formatCents(step.order.totalCents)}
            </button>
          </div>
        </div>
      )}

      {step.name === "processing" && (
        <div className="step processing" role="status">
          <div className="blobs" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <h3 ref={heading} tabIndex={-1}>
            Processando o pagamento…
          </h3>
          <p className="fine">É uma simulação: nenhum valor é cobrado.</p>
        </div>
      )}

      {step.name === "done" && (
        <div className="step result">
          {products.state.status === "ready" && (
            <div className="adopted-thumbs" aria-hidden="true">
              {step.order.items.map((item) => {
                const product =
                  products.state.status === "ready"
                    ? products.state.products.find((candidate) => candidate.id === item.productId)
                    : undefined;
                return product ? (
                  <img
                    key={item.productId}
                    src={apiAssetUrl(product.imageUrl)}
                    alt=""
                    width={72}
                    height={72}
                  />
                ) : null;
              })}
            </div>
          )}
          <h3 ref={heading} tabIndex={-1}>
            Pedido aprovado!
          </h3>
          <span className="badge-free">Nenhum valor foi cobrado</span>
          <p>
            Os mascotes adotados já estão em Meus mascotes, cada um com a explicação do seu
            conceito. Total simulado: {formatCents(step.order.totalCents)}.
          </p>
          <dl className="receipt">
            <div>
              <dt>Código do pedido</dt>
              <dd className="code">{step.order.id}</dd>
            </div>
            <div>
              <dt>Recibo</dt>
              <dd className="code">{step.payment.receiptCode}</dd>
            </div>
          </dl>
          <p className="fine">
            Sem login, é o código que mostra o pedido. Sua coleção fica salva neste navegador.
          </p>
          <div className="step-actions">
            <button className="btn btn--soft" type="button" onClick={onClose}>
              Voltar à vitrine
            </button>
            <a className="btn btn--lilac" href="#mascotes" onClick={onClose}>
              Ver meus mascotes
            </a>
          </div>
        </div>
      )}
    </Dialog>
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function messageOf(error: unknown): string {
  return error instanceof ApiError ? error.message : "Algo deu errado. Tente de novo.";
}

function themeColors(): string[] {
  const styles = getComputedStyle(document.documentElement);
  return ["--coral", "--mint", "--lilac", "--sun"].map((token) =>
    styles.getPropertyValue(token).trim(),
  );
}
