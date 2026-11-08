import "./dialog.css";

import { useEffect, useRef, type ReactNode } from "react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  // "drawer" desliza da direita (carrinho); "modal" aparece no centro (checkout); "menu" é um painel
  // pequeno no canto do cabeçalho (configurações).
  variant: "drawer" | "modal" | "menu";
  children: ReactNode;
}

// <dialog> nativo com showModal(): o navegador já prende o foco dentro dele, fecha com Esc, deixa o
// resto da página inerte e devolve o foco a quem abriu. É a forma mais segura de fazer um modal acessível.
// Mesma duração da animação de saída em dialog.css.
const CLOSE_ANIMATION_MS = 280;

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Dialog({ open, onClose, labelledBy, variant, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      dialog.classList.remove("is-closing");
      if (!dialog.open) dialog.showModal();
      return;
    }
    if (!dialog.open) return;
    if (prefersReducedMotion()) {
      dialog.close();
      return;
    }
    // Fecha em duas etapas: primeiro a animação de saída, depois o close() de verdade.
    dialog.classList.add("is-closing");
    const timer = window.setTimeout(() => {
      dialog.classList.remove("is-closing");
      dialog.close();
    }, CLOSE_ANIMATION_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`dialog dialog--${variant}`}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onCancel={(event) => {
        // O Esc fecharia na hora; assim ele passa pelo mesmo caminho animado do botão de fechar.
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // Clique fora do conteúdo (no fundo escurecido) fecha, como esperado num painel.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dialog-panel">{children}</div>
    </dialog>
  );
}
