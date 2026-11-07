import "./orders.css";

import { apiAssetUrl } from "../../shared/api/client.ts";
import type { Order } from "../../shared/api/types.ts";
import { formatCents, formatDateTime } from "../../shared/format.ts";
import { useMyOrders } from "./useMyOrders.ts";

interface OrdersPageProps {
  // Reabre o checkout direto no pagamento, para pedidos que ficaram aguardando.
  onPay: (order: Order) => void;
}

export function OrdersPage({ onPay }: OrdersPageProps) {
  const state = useMyOrders();

  return (
    <section aria-labelledby="orders-title">
      <div className="intro">
        <h1 id="orders-title">Meus pedidos</h1>
        <p>
          Sem login e sem cadastro: seus pedidos ficam salvos neste navegador. Cada um tem um código
          único que só você conhece.
        </p>
      </div>

      {state.status === "loading" && (
        <p className="fine" role="status">
          Buscando seus pedidos…
        </p>
      )}

      {state.status === "error" && (
        <p className="error-note" role="alert">
          {state.message}
        </p>
      )}

      {state.status === "ready" && state.orders.length === 0 && (
        <div className="orders-empty clay">
          <img
            src={apiAssetUrl("/images/mascots/tartaruga-do-rollback.svg")}
            alt=""
            width={120}
            height={120}
          />
          <strong>Nenhum pedido neste navegador</strong>
          <span>Quando você finalizar uma compra simulada, ela aparece aqui.</span>
          <a className="btn" href="#vitrine">
            Ir para a vitrine
          </a>
        </div>
      )}

      {state.status === "ready" && state.orders.length > 0 && (
        <ul className="orders">
          {state.orders.map((order) => (
            <li key={order.id} className="order clay">
              <div className="order-head">
                <h2>
                  {order.items.map((item) => `${item.quantity}× ${item.productName}`).join(", ")}
                </h2>
                {order.status === "paid" ? (
                  <span className="status status--paid">Pago de mentirinha</span>
                ) : (
                  <span className="status status--waiting">Aguardando pagamento</span>
                )}
              </div>
              <div className="order-meta">
                <span>
                  {formatDateTime(order.paidAt ?? order.createdAt)}
                  {order.status === "paid" ? " · nenhum valor cobrado" : ""}
                </span>
                <strong>{formatCents(order.totalCents)}</strong>
              </div>
              <div className="order-foot">
                <span className="code" aria-label="Código do pedido">
                  {order.id}
                </span>
                {order.status === "awaiting_payment" && (
                  <button
                    className="btn btn--mint btn--small"
                    type="button"
                    onClick={() => onPay(order)}
                  >
                    Pagar agora
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
