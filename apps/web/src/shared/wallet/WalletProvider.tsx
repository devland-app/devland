import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { ApiError, createWallet, getWallet } from "../api/client.ts";
import { readStored, writeStored } from "../storage.ts";
import { WalletContext, type WalletContextValue } from "./walletContext.ts";

const STORAGE_KEY = "devland-wallet";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isWalletId = (value: unknown): value is string | null =>
  value === null || (typeof value === "string" && UUID.test(value));

// Sem login: o código da carteira fica neste navegador, como os códigos dos pedidos. A carteira
// só é criada quando é usada (primeiro quiz ou primeira adoção), e não a cada visita.
export function WalletProvider({ children }: { children: ReactNode }) {
  const [storedId] = useState(() => readStored(STORAGE_KEY, isWalletId, null));
  const walletId = useRef<string | null>(storedId);
  const creating = useRef<Promise<string> | null>(null);
  const [status, setStatus] = useState<WalletContextValue["status"]>(
    storedId ? "loading" : "ready",
  );
  const [balanceCoins, setBalanceCoins] = useState(0);

  const refresh = useCallback(async () => {
    const id = walletId.current;
    if (!id) return;
    try {
      const wallet = await getWallet(id);
      setBalanceCoins(wallet.balanceCoins);
      setStatus("ready");
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        // A carteira não existe mais (banco recriado, por exemplo): uma nova nasce no próximo uso.
        walletId.current = null;
        writeStored(STORAGE_KEY, null);
        setBalanceCoins(0);
        setStatus("ready");
        return;
      }
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const ensureWallet = useCallback(async () => {
    if (walletId.current) return walletId.current;
    // Dois cliques juntos (ou quiz e adoção ao mesmo tempo) esperam a mesma carteira nova.
    creating.current ??= createWallet()
      .then((wallet) => {
        walletId.current = wallet.id;
        writeStored(STORAGE_KEY, wallet.id);
        setBalanceCoins(wallet.balanceCoins);
        setStatus("ready");
        return wallet.id;
      })
      .finally(() => {
        creating.current = null;
      });
    return creating.current;
  }, []);

  const value = useMemo<WalletContextValue>(
    () => ({ status, balanceCoins, ensureWallet, updateBalance: setBalanceCoins, refresh }),
    [status, balanceCoins, ensureWallet, refresh],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
