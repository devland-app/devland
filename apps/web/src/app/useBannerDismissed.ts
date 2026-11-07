import { useState } from "react";

const STORAGE_KEY = "devland-banner-dismissed";

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

// O aviso de "loja simulada" pode ser fechado; a escolha vale neste navegador. O restante da loja
// (preço simulado, checkout, rodapé) continua deixando claro que nada é vendido.
export function useBannerDismissed(): { dismissed: boolean; dismiss: () => void } {
  const [dismissed, setDismissed] = useState(wasDismissed);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // Sem armazenamento: o aviso some só até recarregar a página.
    }
    setDismissed(true);
  }

  return { dismissed, dismiss };
}
