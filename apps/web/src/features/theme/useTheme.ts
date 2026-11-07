import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

// Mesma chave lida pelo script do index.html, que aplica o tema antes da primeira pintura.
const STORAGE_KEY = "devland-theme";
const darkQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

function chosenTheme(): Theme | undefined {
  const value = document.documentElement.dataset.theme;
  return value === "dark" || value === "light" ? value : undefined;
}

function systemTheme(): Theme {
  return darkQuery().matches ? "dark" : "light";
}

// Sem escolha explícita, a loja segue o tema do sistema; o botão grava a escolha da pessoa.
export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useState<Theme>(() => chosenTheme() ?? systemTheme());

  useEffect(() => {
    const query = darkQuery();
    const followSystem = () => {
      if (!chosenTheme()) {
        setTheme(systemTheme());
      }
    };
    query.addEventListener("change", followSystem);
    return () => query.removeEventListener("change", followSystem);
  }, []);

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Sem armazenamento: a escolha vale até fechar a página.
    }
    setTheme(next);
  }

  return { theme, toggleTheme };
}
