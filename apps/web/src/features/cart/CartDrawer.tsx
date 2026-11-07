import "./cart.css";

import { useAdoptions } from "../../shared/adoptions/adoptionsContext.ts";
import { apiAssetUrl } from "../../shared/api/client.ts";
import type { Order } from "../../shared/api/types.ts";
import { useCart } from "../../shared/cart/cartContext.ts";
import { formatCents } from "../../shared/format.ts";
import { Dialog } from "../../shared/ui/Dialog.tsx";

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
                <img src={apiAssetUrl(line.imageUrl)} alt="" width={64} height={64} />
                <div className="cart-item-body">
                  <h3>{line.name}</h3>
                  <span className="subtotal">{formatCents(line.priceCents)}</span>
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
          <span>Total estimado</span>
          <span>{formatCents(cart.estimatedTotalCents)}</span>
        </div>
        <p className="fine">Valor simulado: nada será cobrado.</p>
        <button
          className="btn btn--mint btn--block"
          type="button"
          onClick={onCheckout}
          disabled={cart.count === 0}
        >
          Finalizar compra simulada
        </button>
        <button className="btn btn--soft btn--block" type="button" onClick={onClose}>
          Continuar olhando
        </button>
      </div>
    </Dialog>
  );
}
