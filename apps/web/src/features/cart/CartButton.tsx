import { useEffect, useRef } from "react";

import { useCart } from "./cartContext.ts";

interface CartButtonProps {
  onOpen: () => void;
}

export function CartButton({ onOpen }: CartButtonProps) {
  const { units } = useCart();
  const badge = useRef<HTMLSpanElement>(null);
  const previous = useRef(units);

  // O contador "pula" quando um mascote entra no carrinho (a animação some com movimento reduzido).
  useEffect(() => {
    const element = badge.current;
    if (element && units > previous.current) {
      element.classList.remove("bump");
      void element.offsetWidth;
      element.classList.add("bump");
    }
    previous.current = units;
  }, [units]);

  return (
    <button
      className="btn btn--lilac cart-btn"
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={`Carrinho, ${units} ${units === 1 ? "item" : "itens"}`}
    >
      Carrinho
      <span ref={badge} className="cart-count" data-empty={units === 0} aria-hidden="true">
        {units}
      </span>
    </button>
  );
}
