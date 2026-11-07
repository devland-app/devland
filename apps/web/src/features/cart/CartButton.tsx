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
      className="btn btn--lilac btn--icon cart-btn"
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={`Carrinho, ${units} ${units === 1 ? "item" : "itens"}`}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M2.5 3.5h2.6l2.4 11.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.5l1.7-7.3H6.2" />
        <circle cx="9.6" cy="20.2" r="1.4" fill="currentColor" />
        <circle cx="17.4" cy="20.2" r="1.4" fill="currentColor" />
      </svg>
      <span ref={badge} className="cart-count" data-empty={units === 0} aria-hidden="true">
        {units}
      </span>
    </button>
  );
}
