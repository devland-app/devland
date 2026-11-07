import "./wallet.css";

import { formatCoins, formatNumber } from "../../shared/format.ts";
import { CoinIcon } from "../../shared/ui/Coins.tsx";
import { useWallet } from "../../shared/wallet/walletContext.ts";

// Saldo sempre à vista no cabeçalho. É só informação: não é botão nem link.
export function WalletBalance() {
  const wallet = useWallet();
  const known = wallet.status === "ready";

  return (
    <p className="wallet-balance">
      <CoinIcon />
      {/* A key muda com o saldo: o número "pula" quando chegam moedas novas. */}
      <span key={wallet.balanceCoins} className="wallet-amount" aria-hidden="true">
        {known ? formatNumber(wallet.balanceCoins) : "…"}
      </span>
      <span className="sr-only">
        {known ? `Saldo: ${formatCoins(wallet.balanceCoins)}` : "Saldo indisponível"}
      </span>
    </p>
  );
}
