import "./wallet.css";

import { formatCoins, formatNumber } from "../../shared/format.ts";
import { CoinIcon } from "../../shared/ui/Coins.tsx";
import { useWallet } from "../../shared/wallet/walletContext.ts";

// Saldo sempre à vista no cabeçalho. Tocar leva aos quizzes, que é onde as moedas são ganhas.
export function WalletBadge() {
  const wallet = useWallet();
  const known = wallet.status === "ready";

  return (
    <a
      className="btn btn--soft wallet-badge"
      href="#quizzes"
      aria-label={
        known
          ? `Saldo: ${formatCoins(wallet.balanceCoins)}. Ganhar moedas nos quizzes`
          : "Saldo indisponível. Ir para os quizzes"
      }
    >
      <CoinIcon />
      {/* A key muda com o saldo: o número "pula" quando chegam moedas novas. */}
      <span key={wallet.balanceCoins} className="wallet-amount" aria-hidden="true">
        {known ? formatNumber(wallet.balanceCoins) : "…"}
      </span>
    </a>
  );
}
