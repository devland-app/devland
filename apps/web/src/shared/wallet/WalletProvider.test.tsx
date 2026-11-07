import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, createWallet, getWallet } from "../api/client.ts";
import { useWallet } from "./walletContext.ts";
import { WalletProvider } from "./WalletProvider.tsx";

vi.mock("../api/client.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/client.ts")>()),
  createWallet: vi.fn(),
  getWallet: vi.fn(),
}));

const WALLET_ID = "11111111-1111-4111-8111-111111111111";

function Probe() {
  const wallet = useWallet();
  return (
    <>
      <p>
        {wallet.status} · {wallet.balanceCoins} · {wallet.walletId ?? "sem carteira"}
      </p>
      <button
        type="button"
        onClick={() => {
          // Dois usos ao mesmo tempo (ex.: quiz e checkout) não podem criar duas carteiras.
          void wallet.ensureWallet();
          void wallet.ensureWallet();
        }}
      >
        usar
      </button>
    </>
  );
}

function renderWallet() {
  return render(
    <WalletProvider>
      <Probe />
    </WalletProvider>,
  );
}

describe("WalletProvider", () => {
  beforeEach(() => {
    vi.mocked(createWallet).mockReset();
    vi.mocked(getWallet).mockReset();
  });

  it("só cria a carteira no primeiro uso, e uma vez só", async () => {
    vi.mocked(createWallet).mockResolvedValue({
      id: WALLET_ID,
      balanceCoins: 0,
      createdAt: "2026-11-07T12:00:00.000Z",
    });
    renderWallet();
    expect(screen.getByText("ready · 0 · sem carteira")).toBeInTheDocument();
    expect(createWallet).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "usar" }));
    expect(await screen.findByText(`ready · 0 · ${WALLET_ID}`)).toBeInTheDocument();
    expect(createWallet).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem("devland-wallet") ?? "null")).toBe(WALLET_ID);
  });

  it("recupera o saldo da carteira salva neste navegador", async () => {
    localStorage.setItem("devland-wallet", JSON.stringify(WALLET_ID));
    vi.mocked(getWallet).mockResolvedValue({
      id: WALLET_ID,
      balanceCoins: 120,
      createdAt: "2026-11-07T12:00:00.000Z",
    });
    renderWallet();
    expect(await screen.findByText(`ready · 120 · ${WALLET_ID}`)).toBeInTheDocument();
  });

  it("esquece a carteira que não existe mais (banco recriado)", async () => {
    localStorage.setItem("devland-wallet", JSON.stringify(WALLET_ID));
    vi.mocked(getWallet).mockRejectedValue(new ApiError(404, "Carteira não encontrada."));
    renderWallet();
    expect(await screen.findByText("ready · 0 · sem carteira")).toBeInTheDocument();
    expect(localStorage.getItem("devland-wallet")).toBe("null");
  });

  it("avisa quando a API não responde, sem perder a carteira", async () => {
    localStorage.setItem("devland-wallet", JSON.stringify(WALLET_ID));
    vi.mocked(getWallet).mockRejectedValue(new ApiError(0, "Sem conexão."));
    renderWallet();
    await waitFor(() => expect(screen.getByText(/^error/)).toBeInTheDocument());
    expect(JSON.parse(localStorage.getItem("devland-wallet") ?? "null")).toBe(WALLET_ID);
  });
});
