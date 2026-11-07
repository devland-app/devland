import { useTheme } from "./useTheme.ts";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";

  return (
    <button
      className="btn btn--soft btn--round"
      type="button"
      onClick={toggleTheme}
      aria-pressed={dark}
      aria-label={
        dark ? "Tema escuro ativo. Mudar para o claro" : "Tema claro ativo. Mudar para o escuro"
      }
    >
      <span aria-hidden="true">{dark ? "☾" : "☀︎"}</span>
    </button>
  );
}
