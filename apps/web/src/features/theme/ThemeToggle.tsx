import { useSound } from "../../shared/sound/soundContext.ts";
import { useTheme } from "./useTheme.ts";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const sound = useSound();
  const dark = theme === "dark";

  function changeTheme() {
    sound.play(dark ? "themeLight" : "themeDark");
    toggleTheme();
  }

  return (
    <button
      className="btn btn--soft btn--icon"
      type="button"
      onClick={changeTheme}
      aria-pressed={dark}
      aria-label={
        dark ? "Tema escuro ativo. Mudar para o claro" : "Tema claro ativo. Mudar para o escuro"
      }
    >
      {dark ? (
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z" fill="currentColor" />
        </svg>
      ) : (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4.2" fill="currentColor" stroke="none" />
          <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
        </svg>
      )}
    </button>
  );
}
