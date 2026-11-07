import "./cart.css";

import { useAdoptions } from "../../shared/adoptions/adoptionsContext.ts";
import type { Order } from "../../shared/api/types.ts";
import { useCart } from "../../shared/cart/cartContext.ts";
import { useWallet } from "../../shared/wallet/walletContext.ts";
import { Coins } from "../../shared/ui/Coins.tsx";
import { Dialog } from "../../shared/ui/Dialog.tsx";
import { MascotArt } from "../../shared/ui/MascotArt.tsx";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  onCheckout: () => void;
  // Retoma o pagamento de um pedido que ficou aguardando.
  onPayPending: (order: Order) => void;
}

export function CartDrawer({ open, onClose, onCheckout, onPayPending }: CartDrawerProps) {
  const cart = useCart();
  const { pendingOrders } = useAdoptions();
  const wallet = useWallet();

  return (
    <Dialog open={open} onClose={onClose} labelledBy="cart-title" variant="drawer">
      <div className="panel-head">
        <h2 id="cart-title">Seu carrinho</h2>
        <button
          className="btn btn--soft btn--icon"
          type="button"
          onClick={onClose}
          aria-label="Fechar carrinho"
        >
          ×
        </button>
      </div>

      <div className="cart-content">
        {pendingOrders.map((order) => (
          <div key={order.id} className="pending-note" role="status">
            <p>
              <strong>Pedido aguardando pagamento:</strong>{" "}
              {order.items.map((item) => item.productName).join(", ")}.
            </p>
            <button
              className="btn btn--mint btn--small"
              type="button"
              onClick={() => onPayPending(order)}
            >
              Pagar agora
            </button>
          </div>
        ))}

        {cart.lines.length === 0 ? (
          <div className="cart-empty">
            <strong>Carrinho vazio</strong>
            <span>Escolha um mascote na vitrine e toque em "Adotar".</span>
          </div>
        ) : (
          <ul className="cart-list">
            {cart.lines.map((line) => (
              <li key={line.productId} className="cart-item">
                <MascotArt product={line} size={64} />
                <div className="cart-item-body">
                  <h3>{line.name}</h3>
                  <Coins value={line.priceCoins} size="sm" />
                </div>
                <button
                  className="btn btn--soft btn--small"
                  type="button"
                  onClick={() => cart.remove(line.productId)}
                  aria-label={`Remover ${line.name} do carrinho`}
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="cart-foot">
        <div className="total-row">
          <span>Total</span>
          <Coins value={cart.estimatedTotalCoins} />
        </div>
        <p className="fine">
          Pago com as moedas ganhas nos quizzes. Seu saldo:{" "}
          {wallet.status === "ready" ? `${wallet.balanceCoins} moedas` : "…"}.
        </p>
        <button
          className="btn btn--mint btn--block"
          type="button"
          onClick={onCheckout}
          disabled={cart.count === 0}
        >
          Finalizar adoção
        </button>
        {/* Link, e não botão: de qualquer página, leva de volta à vitrine e fecha o carrinho. */}
        <a className="btn btn--soft btn--block" href="#vitrine" onClick={onClose}>
          Continuar olhando
        </a>
      </div>
    </Dialog>
  );
}
