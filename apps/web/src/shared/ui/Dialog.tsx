import "./dialog.css";

import { useEffect, useRef, type ReactNode } from "react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  // "drawer" desliza da direita (carrinho); "modal" aparece no centro (checkout).
  variant: "drawer" | "modal";
  children: ReactNode;
}

// <dialog> nativo com showModal(): o navegador já prende o foco dentro dele, fecha com Esc, deixa o
// resto da página inerte e devolve o foco a quem abriu. É a forma mais segura de fazer um modal acessível.
export function Dialog({ open, onClose, labelledBy, variant, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`dialog dialog--${variant}`}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(event) => {
        // Clique fora do conteúdo (no fundo escurecido) fecha, como esperado num painel.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dialog-panel">{children}</div>
    </dialog>
  );
}
