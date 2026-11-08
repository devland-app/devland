import "./checkout.css";

import { useEffect, useRef, useState, type RefObject } from "react";

import { useAdoptions } from "../../shared/adoptions/adoptionsContext.ts";
import { ApiError, createOrder, payOrder } from "../../shared/api/client.ts";
import type { Order } from "../../shared/api/types.ts";
import { useCart } from "../../shared/cart/cartContext.ts";
import { useSound } from "../../shared/sound/soundContext.ts";
import { Coins } from "../../shared/ui/Coins.tsx";
import { MascotArt } from "../../shared/ui/MascotArt.tsx";
import { formatCoins } from "../../shared/format.ts";
import { rememberOrder } from "../../shared/myOrders.ts";
import { Dialog } from "../../shared/ui/Dialog.tsx";
import { useProducts } from "../../shared/useProducts.ts";
import { useWallet } from "../../shared/wallet/walletContext.ts";

import { burstConfetti, themeColors } from "../../shared/ui/confetti.ts";

type Step =
  | { name: "review"; busy: boolean; error?: string }
  | { name: "pay"; order: Order; error?: string }
  | { name: "processing"; order: Order }
  | { name: "done"; order: Order };

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
  const wallet = useWallet();
  const [step, setStep] = useState<Step>(
    resumeOrder ? { name: "pay", order: resumeOrder } : { name: "review", busy: false },
  );
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
    const settled = wallet
      .ensureWallet()
      .then((walletId) => payOrder(order.id, walletId))
      .then(
        (value) => ({ ok: true as const, value }),
        (error: unknown) => ({ ok: false as const, error }),
      );
    const [outcome] = await Promise.all([settled, wait(PROCESSING_MS)]);
    if (!outcome.ok) {
      setStep({ name: "pay", order, error: messageOf(outcome.error) });
      return;
    }
    adoptions.recordOrder(outcome.value.order);
    void wallet.refresh();
    setStep({ name: "done", order: outcome.value.order });
    burstConfetti(themeColors());
    sound.play("chime");
  }

  const currentKey = step.name === "processing" ? "pay" : step.name;

  return (
    <Dialog open onClose={onClose} labelledBy="checkout-title" variant="modal">
      <div className="panel-head">
        <h2 id="checkout-title">Adoção</h2>
        <button
          className="btn btn--soft btn--icon"
          type="button"
          onClick={onClose}
          aria-label="Fechar checkout"
        >
          ×
        </button>
      </div>

      <ol className="steps" aria-label="Etapas da adoção">
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
                <Coins value={line.priceCoins} size="sm" />
              </li>
            ))}
          </ul>
          <div className="total-row">
            <span>Total</span>
            <Coins value={cart.estimatedTotalCoins} />
          </div>
          <p className="fine">O total oficial é conferido pela loja no próximo passo.</p>
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
        <CoinPayment
          order={step.order}
          error={step.error}
          heading={heading}
          onPay={() => pay(step.order)}
          onLater={onClose}
        />
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
                  <MascotArt key={item.productId} product={product} size={72} />
                ) : null;
              })}
            </div>
          )}
          <h3 ref={heading} tabIndex={-1}>
            Adoção concluída!
          </h3>
          <span className="badge-free">Pago com moedas virtuais</span>
          <p>
            Os mascotes adotados já estão em Meus mascotes, cada um com a explicação do seu
            conceito. Total: {formatCoins(step.order.totalCoins)}.
          </p>
          <p className="fine">Sua coleção fica salva neste navegador.</p>
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

interface CoinPaymentProps {
  order: Order;
  error?: string;
  heading: RefObject<HTMLHeadingElement | null>;
  onPay: () => void;
  onLater: () => void;
}

// Pagamento com moedas: mostra saldo, total e o que sobra. Sem saldo suficiente, o pedido fica
// guardado aguardando pagamento e a tela aponta para os quizzes.
function CoinPayment({ order, error, heading, onPay, onLater }: CoinPaymentProps) {
  const wallet = useWallet();
  const ready = wallet.status === "ready";
  const missing = order.totalCoins - wallet.balanceCoins;

  return (
    <div className="step">
      <h3 ref={heading} tabIndex={-1}>
        Pagamento com moedas
      </h3>
      <dl className="coin-summary">
        <div>
          <dt>Seu saldo</dt>
          <dd>{ready ? <Coins value={wallet.balanceCoins} /> : "…"}</dd>
        </div>
        <div>
          <dt>Total do pedido</dt>
          <dd>
            <Coins value={order.totalCoins} />
          </dd>
        </div>
        {ready && missing <= 0 && (
          <div>
            <dt>Saldo depois</dt>
            <dd>
              <Coins value={-missing} />
            </dd>
          </div>
        )}
      </dl>
      {ready && missing > 0 && (
        <p className="error-note">
          Faltam {formatCoins(missing)}.{" "}
          <a href="#quizzes" onClick={onLater}>
            Ganhe moedas nos quizzes
          </a>
          : o pedido fica guardado aguardando pagamento.
        </p>
      )}
      {wallet.status === "error" && (
        <p className="error-note" role="alert">
          Não deu para conferir o saldo agora. Tente de novo em instantes.
        </p>
      )}
      {error && (
        <p className="error-note" role="alert">
          {error}
        </p>
      )}
      <p className="fine">As moedas são virtuais e não valem dinheiro.</p>
      <div className="step-actions">
        <button className="btn btn--soft" type="button" onClick={onLater}>
          Pagar depois
        </button>
        <button
          className="btn btn--mint"
          type="button"
          onClick={onPay}
          disabled={!ready || missing > 0}
        >
          Pagar {formatCoins(order.totalCoins)}
        </button>
      </div>
    </div>
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function messageOf(error: unknown): string {
  return error instanceof ApiError ? error.message : "Algo deu errado. Tente de novo.";
}
