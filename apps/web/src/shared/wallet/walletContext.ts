import { createContext, useContext } from "react";

export interface WalletContextValue {
  // "loading" enquanto confere o saldo salvo; "error" se a API não respondeu.
  status: "loading" | "ready" | "error";
  balanceCoins: number;
  // Devolve o código da carteira, criando uma na primeira vez que ela é necessária.
  ensureWallet: () => Promise<string>;
  // A API devolve o saldo novo depois de uma resposta de quiz: a tela atualiza sem outra consulta.
  updateBalance: (balanceCoins: number) => void;
  refresh: () => Promise<void>;
}

export const WalletContext = createContext<WalletContextValue | null>(null);

export function useWallet(): WalletContextValue {
  const wallet = useContext(WalletContext);
  if (!wallet) {
    throw new Error("useWallet precisa estar dentro de <WalletProvider>");
  }
  return wallet;
}
