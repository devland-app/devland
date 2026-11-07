import "./cart.css";

import { apiAssetUrl } from "../../shared/api/client.ts";
import { formatCents } from "../../shared/format.ts";
import { Dialog } from "../../shared/ui/Dialog.tsx";
import { useCart } from "./cartContext.ts";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  onCheckout: () => void;
}

export function CartDrawer({ open, onClose, onCheckout }: CartDrawerProps) {
  const { lines, units, estimatedTotalCents, maxUnitsFor, setQuantity } = useCart();

  return (
    <Dialog open={open} onClose={onClose} labelledBy="cart-title" variant="drawer">
      <div className="panel-head">
        <h2 id="cart-title">Seu carrinho</h2>
        <button
          className="btn btn--soft btn--round"
          type="button"
          onClick={onClose}
          aria-label="Fechar carrinho"
        >
          ×
        </button>
      </div>

      {lines.length === 0 ? (
        <div className="cart-empty">
          <img src={apiAssetUrl("/images/mascots/lesminha-do-pipeline.svg")} alt="" width={120} />
          <strong>Carrinho vazio</strong>
          <span>Escolha um mascote na vitrine e toque em "Adotar".</span>
        </div>
      ) : (
        <ul className="cart-list">
          {lines.map((line) => (
            <li key={line.productId} className="cart-item">
              <img src={apiAssetUrl(line.imageUrl)} alt="" width={64} height={64} />
              <div>
                <h3>{line.name}</h3>
                <div className="cart-line">
                  <div className="stepper" role="group" aria-label={`Quantidade de ${line.name}`}>
                    <button
                      className="btn btn--soft"
                      type="button"
                      onClick={() => setQuantity(line.productId, line.quantity - 1)}
                      aria-label={line.quantity === 1 ? "Tirar do carrinho" : "Remover uma unidade"}
                    >
                      −
                    </button>
                    <output aria-live="polite">{line.quantity}</output>
                    <button
                      className="btn btn--soft"
                      type="button"
                      onClick={() => setQuantity(line.productId, line.quantity + 1)}
                      disabled={line.quantity >= maxUnitsFor(line.productId)}
                      aria-label="Adicionar uma unidade"
                    >
                      +
                    </button>
                  </div>
                  <span className="subtotal">{formatCents(line.priceCents * line.quantity)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="cart-foot">
        <div className="total-row">
          <span>Total estimado</span>
          <span>{formatCents(estimatedTotalCents)}</span>
        </div>
        <p className="fine">Valor de mentirinha: nada será cobrado.</p>
        <button
          className="btn btn--mint btn--block"
          type="button"
          onClick={onCheckout}
          disabled={units === 0}
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
