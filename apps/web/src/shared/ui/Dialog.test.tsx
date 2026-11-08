import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Dialog } from "./Dialog.tsx";

function renderDialog(open: boolean, onClose = vi.fn()) {
  const view = render(
    <Dialog open={open} onClose={onClose} labelledBy="titulo" variant="drawer">
      <h2 id="titulo">Painel</h2>
    </Dialog>,
  );
  const dialog = view.container.querySelector("dialog") as HTMLDialogElement;
  return { ...view, dialog, onClose };
}

describe("Dialog", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("abre como modal com o título como nome", () => {
    const { dialog } = renderDialog(true);
    expect(dialog).toHaveAttribute("open");
    expect(screen.getByRole("dialog", { name: "Painel" })).toBe(dialog);
  });

  it("fecha com animação: primeiro a classe de saída, depois o close de verdade", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const { dialog, rerender } = renderDialog(true, onClose);
    rerender(
      <Dialog open={false} onClose={onClose} labelledBy="titulo" variant="drawer">
        <h2 id="titulo">Painel</h2>
      </Dialog>,
    );
    expect(dialog).toHaveClass("is-closing");
    expect(dialog).toHaveAttribute("open");
    act(() => vi.advanceTimersByTime(280));
    expect(dialog).not.toHaveAttribute("open");
    expect(dialog).not.toHaveClass("is-closing");
  });

  it("reabrir no meio do fechamento cancela a saída", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const { dialog, rerender } = renderDialog(true, onClose);
    const panel = (open: boolean) => (
      <Dialog open={open} onClose={onClose} labelledBy="titulo" variant="drawer">
        <h2 id="titulo">Painel</h2>
      </Dialog>
    );
    rerender(panel(false));
    rerender(panel(true));
    act(() => vi.advanceTimersByTime(500));
    expect(dialog).toHaveAttribute("open");
    expect(dialog).not.toHaveClass("is-closing");
  });

  it("com movimento reduzido, fecha na hora", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("reduce"),
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    const onClose = vi.fn();
    const { dialog, rerender } = renderDialog(true, onClose);
    rerender(
      <Dialog open={false} onClose={onClose} labelledBy="titulo" variant="drawer">
        <h2 id="titulo">Painel</h2>
      </Dialog>,
    );
    expect(dialog).not.toHaveAttribute("open");
  });

  it("Esc e clique no fundo pedem para fechar; clique no conteúdo não", () => {
    const { dialog, onClose } = renderDialog(true);
    const cancel = new Event("cancel", { cancelable: true });
    fireEvent(dialog, cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("heading", { name: "Painel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
