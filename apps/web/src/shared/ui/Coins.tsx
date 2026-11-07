import "./coins.css";

import { formatCoins, formatNumber } from "../format.ts";

interface CoinsProps {
  value: number;
  size?: "sm" | "md" | "lg";
}

// Valor em moedas com a moedinha de massinha. Para leitor de tela, o texto completo ("120 moedas").
export function Coins({ value, size = "md" }: CoinsProps) {
  return (
    <span className={`coins coins--${size}`}>
      <CoinIcon />
      <span aria-hidden="true">{formatNumber(value)}</span>
      <span className="sr-only">{formatCoins(value)}</span>
    </span>
  );
}

export function CoinIcon() {
  return (
    <svg className="coin-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle className="coin-edge" cx="12" cy="13" r="10" />
      <circle className="coin-face" cx="12" cy="11.5" r="10" />
      <circle className="coin-ring" cx="12" cy="11.5" r="6.8" />
      <path
        className="coin-mark"
        d="M12 7.5l1 2.62 2.8.14-2.18 1.77.73 2.71L12 13.2l-2.35 1.54.73-2.71-2.18-1.77 2.8-.14z"
      />
      <ellipse className="coin-shine" cx="8.4" cy="6.9" rx="3" ry="1.5" />
    </svg>
  );
}
